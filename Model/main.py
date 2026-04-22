# ============================================================
# MargDarshan-AI — FastAPI Prediction Server
# File: MargDarshan-AI/Model/main.py
#
# Endpoints:
#   POST /predict          → risk score for a lat/lng position
#   POST /route            → get initial route between two cities
#   POST /reroute          → get safe rerouted path
#   GET  /health           → server health check
#   GET  /corridors        → list supported corridors
# ============================================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pickle
import json
import os
import math
import numpy as np
import pandas as pd
import httpx
import asyncio
from datetime import datetime
import uvicorn

# ─────────────────────────────────────────────
# APP INIT
# ─────────────────────────────────────────────
app = FastAPI(
    title="MargDarshan-AI Prediction Server",
    description="Risk scoring + routing engine for self-healing supply chains",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# CONFIG — API KEYS (set as environment variables)
# ─────────────────────────────────────────────
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "your_openweather_key_here")
TOMTOM_API_KEY      = os.getenv("TOMTOM_API_KEY",      "your_tomtom_key_here")

# Free APIs (no key needed)
OSRM_BASE_URL      = "http://router.project-osrm.org"
ELEVATION_BASE_URL = "https://api.open-elevation.com/api/v1/lookup"

# ─────────────────────────────────────────────
# LOAD MODEL + STATIC FILES AT STARTUP
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("Loading model and static files...")

with open(os.path.join(BASE_DIR, "margdarshan_model.pkl"), "rb") as f:
    MODEL = pickle.load(f)

with open(os.path.join(BASE_DIR, "feature_order.json")) as f:
    FEATURE_ORDER = json.load(f)

with open(os.path.join(BASE_DIR, "corridor_meta.json")) as f:
    CORRIDOR_META = json.load(f)

LANDSLIDE_ZONES = pd.read_csv(os.path.join(BASE_DIR, "landslide_zones.csv"))
PROTEST_ZONES   = pd.read_csv(os.path.join(BASE_DIR, "protest_zones.csv"))

print(f"[OK] Model loaded")
print(f"[OK] Landslide zones: {len(LANDSLIDE_ZONES)} points")
print(f"[OK] Protest zones:   {len(PROTEST_ZONES)} points")
print(f"[OK] Corridors:       {list(CORRIDOR_META.keys())}")

# City → lat/lng lookup for routing
CITY_COORDS = {
    "Mumbai":     (19.0760, 72.8777),
    "Pune":       (18.5204, 73.8567),
    "Nashik":     (19.9975, 73.7898),
    "Goa":        (15.2993, 74.1240),
    "Panaji":     (15.4909, 73.8278),
    "Bengaluru":  (12.9716, 77.5946),
    "Bangalore":  (12.9716, 77.5946),
    "Mangaluru":  (12.9141, 74.8560),
    "Mangalore":  (12.9141, 74.8560),
    "Kochi":      (9.9312,  76.2673),
    "Cochin":     (9.9312,  76.2673),
    "Kozhikode":  (11.2588, 75.7804),
    "Calicut":    (11.2588, 75.7804),
}

# Corridor name resolver — given origin+destination, which corridor is it?
CORRIDOR_ROUTES = {
    ("Mumbai",    "Pune"):      "Mumbai-Pune",
    ("Pune",      "Mumbai"):    "Mumbai-Pune",
    ("Pune",      "Nashik"):    "Pune-Nashik",
    ("Nashik",    "Pune"):      "Pune-Nashik",
    ("Mumbai",    "Goa"):       "Mumbai-Goa",
    ("Mumbai",    "Panaji"):    "Mumbai-Goa",
    ("Goa",       "Mumbai"):    "Mumbai-Goa",
    ("Bengaluru", "Mangaluru"): "Bengaluru-Mangaluru",
    ("Bangalore", "Mangalore"): "Bengaluru-Mangaluru",
    ("Mangaluru", "Bengaluru"): "Bengaluru-Mangaluru",
    ("Kochi",     "Kozhikode"): "Kochi-Kozhikode",
    ("Cochin",    "Calicut"):   "Kochi-Kozhikode",
    ("Kozhikode", "Kochi"):     "Kochi-Kozhikode",
}

# ─────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────

def haversine_km(lat1, lng1, lat2, lng2) -> float:
    """Accurate distance in km between two lat/lng points."""
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi  = math.radians(lat2 - lat1)
    dlng  = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_landslide_nearby(lat: float, lng: float, radius_km: float = 10.0) -> int:
    """Returns 1 if truck is within radius_km of any NASA landslide point."""
    dists = LANDSLIDE_ZONES.apply(
        lambda r: haversine_km(lat, lng, r["latitude"], r["longitude"]), axis=1
    )
    return 1 if (dists < radius_km).any() else 0


def get_protest_severity(lat: float, lng: float, month: int, radius_km: float = 8.0) -> float:
    """
    Returns max severity score of any protest within radius_km
    whose month is within ±1 of current month. Capped at 5.0.
    """
    relevant = PROTEST_ZONES[
        (PROTEST_ZONES["month"] >= month - 1) &
        (PROTEST_ZONES["month"] <= month + 1)
    ]
    if len(relevant) == 0:
        return 0.0
    dists = relevant.apply(
        lambda r: haversine_km(lat, lng, r["latitude"], r["longitude"]), axis=1
    )
    nearby = relevant[dists < radius_km]
    if len(nearby) == 0:
        return 0.0
    return float(min(nearby["severity_score"].max(), 5.0))


async def get_weather(lat: float, lng: float) -> dict:
    """Fetch live rainfall and weather from OpenWeather API."""
    try:
        url = (
            f"https://api.openweathermap.org/data/2.5/weather"
            f"?lat={lat}&lon={lng}&appid={OPENWEATHER_API_KEY}&units=metric"
        )
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            data = resp.json()

        rainfall_mm   = data.get("rain", {}).get("1h", 0.0)
        weather_main  = data.get("weather", [{}])[0].get("main", "Clear")
        wind_speed    = data.get("wind", {}).get("speed", 0.0)
        has_storm     = weather_main in ["Thunderstorm", "Tornado", "Squall"]
        has_heavy_rain = rainfall_mm > 50

        return {
            "rainfall_mm":    round(rainfall_mm, 1),
            "weather_main":   weather_main,
            "wind_speed_mps": round(wind_speed, 1),
            "has_storm":      has_storm,
            "has_heavy_rain": has_heavy_rain,
        }
    except Exception:
        # If API call fails, return safe defaults — don't crash the server
        return {
            "rainfall_mm":    0.0,
            "weather_main":   "Unknown",
            "wind_speed_mps": 0.0,
            "has_storm":      False,
            "has_heavy_rain": False,
        }


async def get_tomtom_traffic(lat: float, lng: float) -> dict:
    """Fetch live traffic congestion from TomTom Flow API."""
    try:
        url = (
            f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
            f"?point={lat},{lng}&key={TOMTOM_API_KEY}"
        )
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            data = resp.json()

        flow = data.get("flowSegmentData", {})
        current_speed = flow.get("currentSpeed", 60)
        free_flow     = flow.get("freeFlowSpeed", 60)
        confidence    = flow.get("confidence", 1.0)

        # Congestion ratio: 1.0 = free flow, 0.0 = standstill
        congestion_ratio = current_speed / free_flow if free_flow > 0 else 1.0
        congestion_pct   = round((1 - congestion_ratio) * 100, 1)

        return {
            "current_speed_kmh": current_speed,
            "free_flow_kmh":     free_flow,
            "congestion_pct":    congestion_pct,
            "confidence":        confidence,
            "is_congested":      congestion_pct > 40,
        }
    except Exception:
        return {
            "current_speed_kmh": 60,
            "free_flow_kmh":     60,
            "congestion_pct":    0.0,
            "confidence":        1.0,
            "is_congested":      False,
        }


async def get_elevation(lat: float, lng: float) -> float:
    """Get elevation in metres from Open Elevation API."""
    try:
        url = f"{ELEVATION_BASE_URL}?locations={lat},{lng}"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            data = resp.json()
        return float(data["results"][0]["elevation"])
    except Exception:
        return 0.0


async def get_osrm_route(
    origin_lat: float, origin_lng: float,
    dest_lat: float,   dest_lng: float,
    avoid_lat: Optional[float] = None,
    avoid_lng: Optional[float] = None,
) -> dict:
    """
    Get route waypoints from OSRM.
    If avoid_lat/lng provided, adds a waypoint offset to force rerouting
    around the danger zone.
    """
    try:
        if avoid_lat and avoid_lng:
            # Offset the avoidance waypoint slightly off the main road
            offset_lat = avoid_lat + 0.05
            offset_lng = avoid_lng + 0.05
            coords = f"{origin_lng},{origin_lat};{offset_lng},{offset_lat};{dest_lng},{dest_lat}"
        else:
            coords = f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"

        url = (
            f"{OSRM_BASE_URL}/route/v1/driving/{coords}"
            f"?overview=full&geometries=geojson&steps=false"
        )
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            data = resp.json()

        if data.get("code") != "Ok":
            return {"waypoints": [], "distance_km": 0, "duration_minutes": 0, "error": data.get("code")}

        route     = data["routes"][0]
        coords_list = route["geometry"]["coordinates"]
        waypoints = [{"lat": c[1], "lng": c[0]} for c in coords_list]

        return {
            "waypoints":        waypoints,
            "distance_km":      round(route["distance"] / 1000, 1),
            "duration_minutes": round(route["duration"] / 60, 1),
            "error":            None,
        }
    except Exception as e:
        return {"waypoints": [], "distance_km": 0, "duration_minutes": 0, "error": str(e)}


def resolve_corridor(origin: str, destination: str) -> str:
    """Map origin+destination city pair to corridor name."""
    key = (origin.strip().title(), destination.strip().title())
    return CORRIDOR_ROUTES.get(key, "Mumbai-Pune")  # default fallback


def compute_risk_score(
    lat: float,
    lng: float,
    month: int,
    corridor_name: str,
    weather: dict,
    traffic: dict,
) -> dict:
    """
    Core risk computation:
    1. Get static lookups (landslide + protest)
    2. Run XGBoost model → base probability
    3. Apply live weather + traffic multipliers
    4. Return final risk score + full breakdown
    """
    # Clamp month
    month = max(1, min(12, month))

    # Get corridor metadata
    meta = CORRIDOR_META.get(corridor_name, CORRIDOR_META["Mumbai-Pune"])

    # Static lookups
    landslide_nearby = get_landslide_nearby(lat, lng)
    severity_score   = get_protest_severity(lat, lng, month)

    # Build feature vector in exact training order
    features = pd.DataFrame([{
        "latitude":         lat,
        "longitude":        lng,
        "month":            month,
        "corridor_code":    meta["code"],
        "rain_risk_weight": meta["rain_risk"],
        "road_risk_weight": meta["road_risk"],
        "landslide_nearby": landslide_nearby,
        "severity_score":   severity_score,
    }])[FEATURE_ORDER]

    # XGBoost base probability
    base_prob = float(MODEL.predict_proba(features)[0][1])

    # Live weather multiplier
    weather_multiplier = 1.0
    if weather["has_storm"]:
        weather_multiplier += 0.20
    elif weather["has_heavy_rain"]:
        weather_multiplier += 0.15
    elif weather["rainfall_mm"] > 20:
        weather_multiplier += 0.08
    elif weather["rainfall_mm"] > 5:
        weather_multiplier += 0.03

    # Live traffic multiplier
    traffic_multiplier = 1.0
    if traffic["is_congested"]:
        traffic_multiplier += 0.10

    # Final score (capped at 100)
    final_prob  = min(base_prob * weather_multiplier * traffic_multiplier, 1.0)
    risk_score  = round(final_prob * 100, 1)

    # Severity label
    if risk_score >= 80:
        severity_label = "CRITICAL"
        action         = "REROUTE"
    elif risk_score >= 60:
        severity_label = "HIGH"
        action         = "MONITOR"
    elif risk_score >= 40:
        severity_label = "MEDIUM"
        action         = "MONITOR"
    else:
        severity_label = "LOW"
        action         = "CLEAR"

    # Risk breakdown (how much each factor contributed)
    breakdown = {
        "landslide_risk": round(landslide_nearby * 45.0, 1),
        "protest_risk":   round((severity_score / 5.0) * 35.0, 1),
        "weather_risk":   round((weather_multiplier - 1.0) * 100, 1),
        "traffic_risk":   round((traffic_multiplier - 1.0) * 100, 1),
    }

    return {
        "risk_score":        risk_score,
        "severity":          severity_label,
        "action":            action,
        "breakdown":         breakdown,
        "landslide_nearby":  bool(landslide_nearby),
        "protest_severity":  round(severity_score, 1),
        "rainfall_mm":       weather["rainfall_mm"],
        "weather_condition": weather["weather_main"],
        "congestion_pct":    traffic["congestion_pct"],
    }


# ─────────────────────────────────────────────
# REQUEST / RESPONSE MODELS
# ─────────────────────────────────────────────

class PredictRequest(BaseModel):
    lat:            float
    lng:            float
    corridor:       str
    month:          Optional[int]  = None  # if None, uses current month

class RouteRequest(BaseModel):
    origin_city:      str
    destination_city: str

class RerouteRequest(BaseModel):
    current_lat:      float
    current_lng:      float
    destination_city: str
    corridor:         str


class WaterPortCoords(BaseModel):
    name: str
    lat: float
    lng: float


class WaterRouteRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    vessel_type: str  # 'container', 'bulk_carrier', 'tanker', 'general_cargo', 'roro'
    quantity_tons: int


class WaterCostEstimateRequest(BaseModel):
    distance_nm: float
    vessel_dwt_tons: int
    vessel_speed_knots: float
    fuel_consumption_t_per_day: float = 25
    fuel_cost_per_ton: float = 600
    quantity_tons: int


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status":    "ok",
        "model":     "loaded",
        "corridors": list(CORRIDOR_META.keys()),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/corridors")
def get_corridors():
    return {
        "supported_corridors": list(CORRIDOR_META.keys()),
        "city_pairs": [
            {"origin": o, "destination": d, "corridor": c}
            for (o, d), c in CORRIDOR_ROUTES.items()
        ]
    }


@app.post("/predict")
async def predict(req: PredictRequest):
    """
    Main prediction endpoint.
    Called by backend every 5 seconds with truck's current lat/lng.
    Returns risk score + full breakdown including live weather + traffic.
    """
    if req.corridor not in CORRIDOR_META:
        raise HTTPException(
            status_code=400,
            detail=f"Corridor '{req.corridor}' not supported. "
                   f"Supported: {list(CORRIDOR_META.keys())}"
        )

    month = req.month if req.month else datetime.utcnow().month

    # Fetch live data in parallel context (sequential here for simplicity)
    weather = await get_weather(req.lat, req.lng)
    traffic = await get_tomtom_traffic(req.lat, req.lng)

    # Compute risk
    result = compute_risk_score(
        lat=req.lat,
        lng=req.lng,
        month=month,
        corridor_name=req.corridor,
        weather=weather,
        traffic=traffic,
    )

    return {
        "lat":       req.lat,
        "lng":       req.lng,
        "corridor":  req.corridor,
        "month":     month,
        **result,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/route")
async def get_route(req: RouteRequest):
    """
    Calculate initial route between two cities using OSRM.
    Called once when a shipment is created.
    Returns array of waypoints + distance + duration + corridor name.
    """
    origin_title = req.origin_city.strip().title()
    dest_title   = req.destination_city.strip().title()

    if origin_title not in CITY_COORDS:
        raise HTTPException(status_code=400, detail=f"City '{req.origin_city}' not found.")
    if dest_title not in CITY_COORDS:
        raise HTTPException(status_code=400, detail=f"City '{req.destination_city}' not found.")

    origin_lat, origin_lng = CITY_COORDS[origin_title]
    dest_lat,   dest_lng   = CITY_COORDS[dest_title]
    corridor = resolve_corridor(origin_title, dest_title)

    route = await get_osrm_route(origin_lat, origin_lng, dest_lat, dest_lng)

    if route["error"]:
        raise HTTPException(status_code=502, detail=f"OSRM routing failed: {route['error']}")

    return {
        "origin":           req.origin_city,
        "destination":      req.destination_city,
        "corridor":         corridor,
        "origin_coords":    {"lat": origin_lat, "lng": origin_lng},
        "dest_coords":      {"lat": dest_lat,   "lng": dest_lng},
        "waypoints":        route["waypoints"],
        "distance_km":      route["distance_km"],
        "duration_minutes": route["duration_minutes"],
        "waypoint_count":   len(route["waypoints"]),
    }


@app.post("/reroute")
async def reroute(req: RerouteRequest):
    """
    Calculate a safe reroute from current truck position to destination,
    avoiding the current risky zone.
    Creates multiple offset waypoints to force OSRM to take a significantly different path.
    """
    dest_title = req.destination_city.strip().title()

    if dest_title not in CITY_COORDS:
        raise HTTPException(status_code=400, detail=f"City '{req.destination_city}' not found.")

    dest_lat, dest_lng = CITY_COORDS[dest_title]

    # Calculate direction from current to destination
    dlat = dest_lat - req.current_lat
    dlng = dest_lng - req.current_lng
    dist = math.sqrt(dlat**2 + dlng**2)

    if dist == 0:
        raise HTTPException(status_code=400, detail="Already at destination")

    # Normalize direction
    dir_lat = dlat / dist
    dir_lng = dlng / dist

    # Create two perpendicular offset waypoints (left and right)
    # Try to force a U-turn or sharp deviation from current path
    offset_distance = max(0.3, dist * 0.2)  # 20-30% of distance to destination, minimum 0.3 degrees

    # Left turn offset
    left_lat = req.current_lat - dir_lng * offset_distance
    left_lng = req.current_lng + dir_lat * offset_distance

    # Right turn offset
    right_lat = req.current_lat + dir_lng * offset_distance
    right_lng = req.current_lng - dir_lat * offset_distance

    # Try left route first
    route = await get_osrm_route(
        origin_lat=req.current_lat,
        origin_lng=req.current_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng,
        avoid_lat=left_lat,
        avoid_lng=left_lng,
    )

    # If left route fails or is same as original, try right route
    if route["error"] or len(route["waypoints"]) < 2:
        route = await get_osrm_route(
            origin_lat=req.current_lat,
            origin_lng=req.current_lng,
            dest_lat=dest_lat,
            dest_lng=dest_lng,
            avoid_lat=right_lat,
            avoid_lng=right_lng,
        )

    if route["error"]:
        raise HTTPException(status_code=502, detail=f"Reroute failed: {route['error']}")

    # Score the new route's first waypoint to confirm it's safer
    month   = datetime.utcnow().month
    weather = await get_weather(req.current_lat, req.current_lng)
    traffic = await get_tomtom_traffic(req.current_lat, req.current_lng)

    # Check risk 5 waypoints ahead on new route
    new_route_risk = 0.0
    check_points = route["waypoints"][5:10] if len(route["waypoints"]) > 10 else route["waypoints"]
    for wp in check_points:
        r = compute_risk_score(wp["lat"], wp["lng"], month, req.corridor, weather, traffic)
        new_route_risk = max(new_route_risk, r["risk_score"])

    return {
        "reroute_successful": True,
        "new_route":          route["waypoints"],
        "distance_km":        route["distance_km"],
        "duration_minutes":   route["duration_minutes"],
        "new_route_max_risk": round(new_route_risk, 1),
        "trigger_lat":        req.current_lat,
        "trigger_lng":        req.current_lng,
        "timestamp":          datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────
# WATER SHIPMENT ENDPOINTS
# ─────────────────────────────────────────────

def haversine_nm(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in nautical miles."""
    dist_km = haversine_km(lat1, lng1, lat2, lng2)
    return dist_km / 1.852


def get_coastal_exit(lat: float, lng: float) -> list:
    """
    Returns a waypoint just offshore (~15km) from the port.
    West coast exits west, east coast exits east.
    """
    if lng < 78:  # west coast — small step into Arabian Sea
        return [[lat, lng - 0.15]]
    else:          # east coast — small step into Bay of Bengal
        return [[lat, lng + 0.15]]


def build_sea_bridge(src_lat: float, src_lng: float, dst_lat: float, dst_lng: float) -> list:
    """
    Build realistic ocean route avoiding landmass (India and Sri Lanka).
    Starts/ends at the coastal edge, then follows maritime shipping lanes.
    """
    src_west = src_lng < 78 and src_lat > 7
    dst_west = dst_lng < 78 and dst_lat > 7
    src_east = src_lng > 79 and src_lat > 7
    dst_east = dst_lng > 79 and dst_lat > 7

    crosses_india = (src_west and dst_east) or (src_east and dst_west)
    if not crosses_india:
        # Same-coast route: just add coastal exit/entry points
        return get_coastal_exit(src_lat, src_lng) + get_coastal_exit(dst_lat, dst_lng)

    if src_west:
        # West coast departure → coastal exit → south of Sri Lanka → east coast arrival
        src_exit = get_coastal_exit(src_lat, src_lng)   # step offshore from origin
        dst_entry = get_coastal_exit(dst_lat, dst_lng)  # approach destination from sea
        return src_exit + [
            [17.0, 73.1],  # ~30km offshore Mumbai coast
            [15.5, 73.7],  # offshore Ratnagiri (coast ~73.3)
            [13.5, 74.6],  # offshore Goa/Karwar (coast ~74.1)
            [11.5, 75.4],  # offshore Karnataka (coast ~74.9)
            [9.8,  75.9],  # offshore Kerala (coast ~76.1)
            [8.5,  76.5],  # offshore Kochi (coast ~76.3)
            [7.8,  77.0],  # rounding Kerala tip (coast ~76.9)
            [7.0,  77.5],  # Gulf of Mannar
            [6.0,  78.5],  # southwest of Sri Lanka
            [5.7,  80.0],  # south of Sri Lanka
            [5.9,  81.5],  # southeast of Sri Lanka
            [7.0,  82.5],  # east of Sri Lanka
            [9.5,  83.5],  # Bay of Bengal
            [12.5, 84.5],  # heading northeast
            [15.5, 85.1],  # approaching east coast
        ] + dst_entry
    else:
        dst_entry = get_coastal_exit(dst_lat, dst_lng)
        src_exit  = get_coastal_exit(src_lat, src_lng)
        return src_exit + [
            [15.5, 85.1],
            [12.5, 84.5],
            [9.5,  83.5],
            [7.0,  82.5],
            [5.9,  81.5],
            [5.7,  80.0],
            [6.0,  78.5],
            [7.0,  77.5],
            [7.8,  77.0],
            [8.5,  76.5],
            [9.8,  75.9],
            [11.5, 75.4],
            [13.5, 74.6],
            [15.5, 73.7],
            [17.0, 73.1],
        ] + dst_entry


def sea_route_waypoints(src_lat: float, src_lng: float, dst_lat: float, dst_lng: float, steps: int = 25) -> list:
    """
    Generate realistic smooth sea route waypoints with dense interpolation.
    Creates natural curved paths with many intermediate points.
    """
    bridge = build_sea_bridge(src_lat, src_lng, dst_lat, dst_lng)
    all_pts = [[src_lat, src_lng], *bridge, [dst_lat, dst_lng]]

    result = []
    # Increase steps for smoother curves (25 points between each waypoint)
    for i in range(len(all_pts) - 1):
        la1, ln1 = all_pts[i]
        la2, ln2 = all_pts[i + 1]

        # Linear interpolation with catmull-rom like smoothing
        for j in range(steps):
            t = j / steps
            # Smooth step function for more natural curves
            smooth_t = t * t * (3 - 2 * t)  # Smoothstep interpolation

            result.append({
                "lat": la1 + (la2 - la1) * smooth_t,
                "lng": ln1 + (ln2 - ln1) * smooth_t,
            })

    # Add final point
    result.append({"lat": all_pts[-1][0], "lng": all_pts[-1][1]})
    return result


def estimate_water_cost(distance_nm: float, vessel_dwt: int, quantity_tons: int,
                       speed_knots: float, fuel_consumption_t_day: float,
                       fuel_cost_per_ton: float) -> dict:
    """
    Estimate water shipment costs.
    Formula: fuel_cost + port_fees + crew + insurance + misc
    """
    days_at_sea = (distance_nm / speed_knots) / 24 if speed_knots > 0 else 7

    # Fuel cost
    fuel_consumed = days_at_sea * fuel_consumption_t_day
    fuel_cost = fuel_consumed * fuel_cost_per_ton

    # Port fees (origin + destination)
    base_port_fee = 50000  # ₹
    handling_fee_per_ton = 150  # ₹
    port_fees = base_port_fee * 2 + quantity_tons * handling_fee_per_ton

    # Crew cost
    crew_daily_cost = 25000  # ₹
    crew_cost = days_at_sea * crew_daily_cost

    # Insurance (assume ₹10000 per ton base rate)
    cargo_value_per_ton = 10000
    cargo_value = quantity_tons * cargo_value_per_ton
    insurance_rate = 0.005
    insurance = cargo_value * insurance_rate

    # Miscellaneous
    misc_per_nm = 200
    misc_cost = distance_nm * misc_per_nm

    total = fuel_cost + port_fees + crew_cost + insurance + misc_cost
    cost_per_ton = total / quantity_tons if quantity_tons > 0 else 0

    return {
        "fuel_cost": round(fuel_cost, 2),
        "port_fees": round(port_fees, 2),
        "crew_cost": round(crew_cost, 2),
        "insurance": round(insurance, 2),
        "misc_cost": round(misc_cost, 2),
        "total_cost": round(total, 2),
        "cost_per_ton": round(cost_per_ton, 2),
        "days_at_sea": round(days_at_sea, 1),
    }


@app.get("/water/ports")
def get_water_ports():
    """List all major Indian ports for water shipments."""
    ports = [
        {"name": "Mumbai Port", "city": "Mumbai", "lat": 18.9399, "lng": 72.8355, "region": "west"},
        {"name": "Kolkata Port", "city": "Kolkata", "lat": 22.5726, "lng": 88.3639, "region": "east"},
        {"name": "Kochi Port", "city": "Kochi", "lat": 9.9312, "lng": 76.2673, "region": "south"},
        {"name": "Visakhapatnam Port", "city": "Visakhapatnam", "lat": 17.7011, "lng": 83.2992, "region": "east"},
        {"name": "Chennai Port", "city": "Chennai", "lat": 13.0827, "lng": 80.2707, "region": "south"},
        {"name": "Mormugao Port", "city": "Goa", "lat": 15.4189, "lng": 73.7975, "region": "west"},
        {"name": "Kandla Port", "city": "Gujarat", "lat": 22.0183, "lng": 69.6049, "region": "west"},
        {"name": "Paradip Port", "city": "Odisha", "lat": 19.7638, "lng": 86.6310, "region": "east"},
        {"name": "Mangaluru Port", "city": "Mangaluru", "lat": 12.9141, "lng": 74.8560, "region": "south"},
        {"name": "Port Blair", "city": "Port Blair", "lat": 11.6234, "lng": 92.7265, "region": "north"},
        {"name": "Jawaharlal Nehru Port", "city": "Mumbai", "lat": 19.0176, "lng": 72.9781, "region": "west"},
        {"name": "Ennore Port", "city": "Chennai", "lat": 13.2115, "lng": 80.3200, "region": "south"},
    ]
    return {"ports": ports, "total": len(ports)}


@app.get("/water/vessels")
def get_water_vessels():
    """List available vessel types for water shipping."""
    vessels = [
        "Container Ship",
        "Bulk Carrier",
        "Tanker (Crude)",
        "LNG Carrier",
        "RORO Vessel",
        "General Cargo",
        "Tug & Barge",
    ]
    return {"vessels": vessels, "total": len(vessels)}


@app.post("/water/route")
def get_water_route(req: WaterRouteRequest):
    """
    Calculate sea route between two ports.
    Returns distance, ETA, fuel consumption, and waypoints for map display.
    """
    distance_nm = haversine_nm(req.origin_lat, req.origin_lng, req.destination_lat, req.destination_lng)
    distance_km = distance_nm * 1.852

    # Generate realistic curved route waypoints
    waypoints = sea_route_waypoints(req.origin_lat, req.origin_lng,
                                    req.destination_lat, req.destination_lng)

    # Vessel specs (speed in knots, fuel consumption in tons/day)
    vessel_specs = {
        "Container Ship": {"speed": 22, "consumption": 280},
        "Bulk Carrier": {"speed": 14, "consumption": 45},
        "Tanker (Crude)": {"speed": 15, "consumption": 50},
        "LNG Carrier": {"speed": 19, "consumption": 120},
        "RORO Vessel": {"speed": 20, "consumption": 40},
        "General Cargo": {"speed": 14, "consumption": 35},
        "Tug & Barge": {"speed": 8, "consumption": 25},
    }

    spec = vessel_specs.get(req.vessel_type, vessel_specs["General Cargo"])

    # Calculate ETA (distance in NM / speed in knots)
    eta_hours = distance_nm / spec["speed"] if spec["speed"] > 0 else 0
    eta_days = eta_hours / 24

    # Calculate fuel needed (consumption per day * days at sea)
    fuel_required_tons = eta_days * spec["consumption"]

    return {
        "distance_km": round(distance_km, 1),
        "distance_nm": round(distance_nm, 1),
        "eta_hours": round(eta_hours, 1),
        "eta_days": round(eta_days, 2),
        "vessel_type": req.vessel_type,
        "fuel_required_tons": round(fuel_required_tons, 1),
        "waypoints": waypoints,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/water/smart-route")
async def get_smart_water_route(req: WaterRouteRequest):
    """
    Smart routing using real-time ocean and weather data.
    APIs used:
      - Open-Meteo Marine API (wave height, swell)
      - Open-Meteo Weather API (wind speed)
    Selects safest path from 3 candidate routes.
    """
    src_west = req.origin_lng < 78 and req.origin_lat > 7
    dst_east = req.destination_lng > 79 and req.destination_lat > 7
    crosses = (src_west and dst_east) or (req.origin_lng > 79 and req.destination_lng < 78)

    # Three candidate paths — deep ocean, standard offshore, moderate
    if src_west:
        candidates = {
            "deep_ocean": [
                [17.0, 70.0], [13.0, 69.5], [9.0, 70.5], [6.0, 72.0],
                [4.0, 75.0], [3.5, 79.0], [4.5, 83.5], [8.0, 86.0],
                [13.0, 86.5], [16.0, 86.0],
            ],
            "standard": [
                [17.0, 71.5], [14.0, 71.0], [11.0, 71.5], [9.0, 72.5],
                [7.5, 73.5], [6.0, 75.0], [5.0, 77.0], [4.8, 80.0],
                [5.5, 83.0], [8.0, 85.0], [12.0, 85.5], [15.0, 85.0],
            ],
            "coastal": [
                [16.0, 72.0], [13.0, 73.0], [10.5, 74.0], [8.5, 75.5],
                [7.0, 76.5], [5.5, 78.0], [5.2, 81.0], [6.5, 83.5],
                [9.0, 85.0], [13.5, 85.5],
            ],
        }
    else:
        candidates = {
            "deep_ocean": [
                [16.0, 86.0], [13.0, 86.5], [8.0, 86.0], [4.5, 83.5],
                [3.5, 79.0], [4.0, 75.0], [6.0, 72.0], [9.0, 70.5],
                [13.0, 69.5], [17.0, 70.0],
            ],
            "standard": [
                [15.0, 85.0], [12.0, 85.5], [8.0, 85.0], [5.5, 83.0],
                [4.8, 80.0], [5.0, 77.0], [6.0, 75.0], [7.5, 73.5],
                [9.0, 72.5], [11.0, 71.5], [14.0, 71.0], [17.0, 71.5],
            ],
            "coastal": [
                [13.5, 85.5], [9.0, 85.0], [6.5, 83.5], [5.2, 81.0],
                [5.5, 78.0], [7.0, 76.5], [8.5, 75.5], [10.5, 74.0],
                [13.0, 73.0], [16.0, 72.0],
            ],
        }

    async def fetch_conditions(lat: float, lng: float) -> dict:
        """Fetch wave + wind conditions at a point."""
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                marine_task = client.get(
                    "https://marine-api.open-meteo.com/v1/marine",
                    params={
                        "latitude": lat, "longitude": lng,
                        "current": "wave_height,wind_wave_height,swell_wave_height",
                    },
                )
                weather_task = client.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={
                        "latitude": lat, "longitude": lng,
                        "current": "wind_speed_10m,wind_direction_10m",
                    },
                )
                marine_res, weather_res = await asyncio.gather(marine_task, weather_task, return_exceptions=True)

            wave_h = 0.0
            swell_h = 0.0
            wind_spd = 0.0

            if not isinstance(marine_res, Exception) and marine_res.status_code == 200:
                mc = marine_res.json().get("current", {})
                wave_h  = mc.get("wave_height", 0) or 0
                swell_h = mc.get("swell_wave_height", 0) or 0

            if not isinstance(weather_res, Exception) and weather_res.status_code == 200:
                wc = weather_res.json().get("current", {})
                wind_spd = wc.get("wind_speed_10m", 0) or 0

            return {"lat": lat, "lng": lng, "wave_h": wave_h, "swell_h": swell_h, "wind_spd": wind_spd}
        except Exception:
            return {"lat": lat, "lng": lng, "wave_h": 0, "swell_h": 0, "wind_spd": 0}

    def score_conditions(conds: list) -> float:
        """Lower score = safer/calmer conditions."""
        total = 0.0
        for c in conds:
            total += c["wave_h"] * 2.0      # wave height heavily penalised
            total += c["swell_h"] * 1.5     # swell moderate penalty
            total += c["wind_spd"] * 0.1    # wind light penalty
        return total

    # Sample 4 evenly-spaced waypoints from each candidate for condition checks
    best_name = "standard"
    best_score = float("inf")
    all_scores = {}
    all_conditions = {}

    if crosses:
        for name, bridge in candidates.items():
            indices = [int(i * (len(bridge) - 1) / 3) for i in range(4)]
            sample_pts = [bridge[i] for i in indices]

            conds = await asyncio.gather(*[fetch_conditions(p[0], p[1]) for p in sample_pts])
            sc = score_conditions(conds)
            all_scores[name] = round(sc, 2)
            all_conditions[name] = conds
            if sc < best_score:
                best_score = sc
                best_name = name

    # Generate full smooth route along best path
    if crosses:
        best_bridge = candidates[best_name]
    else:
        best_bridge = build_sea_bridge(req.origin_lat, req.origin_lng,
                                       req.destination_lat, req.destination_lng)

    all_pts = [[req.origin_lat, req.origin_lng], *best_bridge, [req.destination_lat, req.destination_lng]]
    waypoints = []
    steps = 20
    for i in range(len(all_pts) - 1):
        la1, ln1 = all_pts[i]
        la2, ln2 = all_pts[i + 1]
        for j in range(steps):
            t = j / steps
            st = t * t * (3 - 2 * t)
            waypoints.append({"lat": la1 + (la2 - la1) * st, "lng": ln1 + (ln2 - ln1) * st})
    waypoints.append({"lat": all_pts[-1][0], "lng": all_pts[-1][1]})

    # Vessel specs
    vessel_specs = {
        "Container Ship": {"speed": 22, "consumption": 280},
        "Bulk Carrier":   {"speed": 14, "consumption": 45},
        "Tanker (Crude)": {"speed": 15, "consumption": 50},
        "LNG Carrier":    {"speed": 19, "consumption": 120},
        "RORO Vessel":    {"speed": 20, "consumption": 40},
        "General Cargo":  {"speed": 14, "consumption": 35},
        "Tug & Barge":    {"speed": 8,  "consumption": 25},
    }
    spec = vessel_specs.get(req.vessel_type, vessel_specs["General Cargo"])
    distance_nm = haversine_nm(req.origin_lat, req.origin_lng, req.destination_lat, req.destination_lng)
    distance_km = distance_nm * 1.852
    eta_hours = distance_nm / spec["speed"] if spec["speed"] > 0 else 0
    fuel_required_tons = (eta_hours / 24) * spec["consumption"]

    return {
        "distance_km":       round(distance_km, 1),
        "distance_nm":       round(distance_nm, 1),
        "eta_hours":         round(eta_hours, 1),
        "vessel_type":       req.vessel_type,
        "fuel_required_tons": round(fuel_required_tons, 1),
        "waypoints":         waypoints,
        "route_selected":    best_name,
        "route_scores":      all_scores,
        "conditions_sample": all_conditions.get(best_name, []),
        "timestamp":         datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────
# RUN SERVER
# ─────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)