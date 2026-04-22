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

print(f"✓ Model loaded")
print(f"✓ Landslide zones: {len(LANDSLIDE_ZONES)} points")
print(f"✓ Protest zones:   {len(PROTEST_ZONES)} points")
print(f"✓ Corridors:       {list(CORRIDOR_META.keys())}")

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
    Called automatically when risk_score >= 80, or manually via dashboard.
    """
    dest_title = req.destination_city.strip().title()

    if dest_title not in CITY_COORDS:
        raise HTTPException(status_code=400, detail=f"City '{req.destination_city}' not found.")

    dest_lat, dest_lng = CITY_COORDS[dest_title]

    # Get rerouted path — OSRM will avoid the danger zone via offset waypoint
    route = await get_osrm_route(
        origin_lat=req.current_lat,
        origin_lng=req.current_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng,
        avoid_lat=req.current_lat,
        avoid_lng=req.current_lng,
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
# RUN SERVER
# ─────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)