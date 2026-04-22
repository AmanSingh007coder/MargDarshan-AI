const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Get risk scores from the Python ML microservice.
 * @param {number} lat
 * @param {number} lng
 * @returns {{ weather_risk, landslide_risk, social_risk, total_risk }} all 0-100
 */
async function getRiskScore(lat, lng) {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, { lat, lng }, {
      timeout: 5000,
    });
    return response.data;
  } catch (err) {
    console.error('ML service error:', err.message);
    // Fallback: return neutral scores so the app keeps running
    return {
      weather_risk: 0,
      landslide_risk: 0,
      social_risk: 0,
      total_risk: 0,
    };
  }
}

module.exports = { getRiskScore };
