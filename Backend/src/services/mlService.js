const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Mirrors Model/main.py CORRIDOR_ROUTES — maps city pairs to corridor name
const CORRIDOR_MAP = {
  'Mumbai-Pune':         [['Mumbai', 'Pune'], ['Pune', 'Mumbai']],
  'Pune-Nashik':         [['Pune', 'Nashik'], ['Nashik', 'Pune']],
  'Mumbai-Goa':          [['Mumbai', 'Goa'], ['Mumbai', 'Panaji'], ['Goa', 'Mumbai']],
  'Bengaluru-Mangaluru': [
    ['Bengaluru', 'Mangaluru'], ['Bangalore', 'Mangalore'],
    ['Mangaluru', 'Bengaluru'], ['Mangalore', 'Bangalore'],
    ['Bengaluru', 'Mangalore'], ['Bangalore', 'Mangaluru'],
  ],
  'Kochi-Kozhikode': [
    ['Kochi', 'Kozhikode'], ['Cochin', 'Calicut'],
    ['Kozhikode', 'Kochi'], ['Calicut', 'Cochin'],
  ],
};

function resolveCorridor(originCity, destinationCity) {
  const origin = (originCity || '').trim();
  const dest   = (destinationCity || '').trim();
  for (const [corridor, pairs] of Object.entries(CORRIDOR_MAP)) {
    if (pairs.some(([o, d]) => o === origin && d === dest)) return corridor;
  }
  return 'Mumbai-Pune'; // fallback
}

async function getRiskScore(lat, lng, corridor) {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict`,
      { lat, lng, corridor },
      { timeout: 5000 },
    );
    return response.data;
  } catch (err) {
    console.error('ML service error:', err.message);
    // Shape matches the FastAPI /predict response so callers never need null-checks
    return {
      risk_score:        0,
      severity:          'LOW',
      action:            'CLEAR',
      breakdown:         { landslide_risk: 0, protest_risk: 0, weather_risk: 0, traffic_risk: 0 },
      landslide_nearby:  false,
      protest_severity:  0,
      rainfall_mm:       0,
      weather_condition: 'Unknown',
      congestion_pct:    0,
    };
  }
}

module.exports = { getRiskScore, resolveCorridor };
