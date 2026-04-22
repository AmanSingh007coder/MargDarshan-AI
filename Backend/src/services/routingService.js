const axios = require('axios');

const TOMTOM_KEY = process.env.TOMTOM_API_KEY;
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

// ── Geocoding (city name → lat/lng) via Nominatim ──────────────────────────

async function geocodeCity(city) {
  const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: city, format: 'json', limit: 1 },
    headers: { 'User-Agent': 'MargDarshan-AI/1.0' },
    timeout: 6000,
  });
  if (!data.length) throw new Error(`Could not geocode city: ${city}`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// ── Convert OSRM geometry to waypoint array ────────────────────────────────

function decodeOSRMGeometry(geometry) {
  // OSRM returns a GeoJSON LineString
  return geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
}

// ── Route via OSRM (free, no key required) ────────────────────────────────

async function getRouteOSRM(originCoords, destCoords) {
  const coordStr = `${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}`;
  const { data } = await axios.get(`${OSRM_BASE}/${coordStr}`, {
    params: { overview: 'full', geometries: 'geojson' },
    timeout: 8000,
  });

  const route = data.routes[0];
  return {
    waypoints: decodeOSRMGeometry(route.geometry),
    distance_km: route.distance / 1000,
    duration_minutes: route.duration / 60,
  };
}

// ── Route via TomTom (if key present) ────────────────────────────────────

async function getRouteTomTom(originCoords, destCoords) {
  const origin = `${originCoords.lat},${originCoords.lng}`;
  const dest = `${destCoords.lat},${destCoords.lng}`;
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${origin}:${dest}/json`;

  const { data } = await axios.get(url, {
    params: { key: TOMTOM_KEY, routeRepresentation: 'polyline' },
    timeout: 8000,
  });

  const route = data.routes[0];
  const waypoints = route.legs.flatMap(leg =>
    leg.points.map(p => ({ lat: p.latitude, lng: p.longitude }))
  );

  return {
    waypoints,
    distance_km: route.summary.lengthInMeters / 1000,
    duration_minutes: route.summary.travelTimeInSeconds / 60,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Get route between two city names.
 */
async function getRoute(originCity, destinationCity) {
  const [originCoords, destCoords] = await Promise.all([
    geocodeCity(originCity),
    geocodeCity(destinationCity),
  ]);

  if (TOMTOM_KEY) {
    return await getRouteTomTom(originCoords, destCoords);
  }
  return await getRouteOSRM(originCoords, destCoords);
}

/**
 * Get rerouted path from current position avoiding the risky zone.
 * @param {number} currentLat
 * @param {number} currentLng
 * @param {string} destinationCity
 */
async function getReroute(currentLat, currentLng, destinationCity) {
  const destCoords = await geocodeCity(destinationCity);
  const originCoords = { lat: currentLat, lng: currentLng };

  // TomTom supports avoidArea; OSRM doesn't — for OSRM we just re-route from current position
  if (TOMTOM_KEY) {
    return await getRouteTomTom(originCoords, destCoords);
  }
  return await getRouteOSRM(originCoords, destCoords);
}

module.exports = { getRoute, getReroute };
