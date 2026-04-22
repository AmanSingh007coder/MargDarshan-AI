const axios = require('axios');

const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Fetch weather conditions at a lat/lng.
 * @returns {{ rainfall_mm, has_storm_alert, severity }}
 */
async function getWeatherData(lat, lng) {
  try {
    const { data } = await axios.get(OPENWEATHER_BASE, {
      params: {
        lat,
        lon: lng,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
      },
      timeout: 5000,
    });

    // Rain volume for last 1h (if available)
    const rainfall_mm = data.rain?.['1h'] || 0;

    // Storm alert: weather condition codes 200-232 are thunderstorms, 900-901 extreme wind
    const weatherId = data.weather?.[0]?.id || 0;
    const has_storm_alert = weatherId >= 200 && weatherId < 300;

    let severity = 'LOW';
    if (has_storm_alert || rainfall_mm > 50) severity = 'CRITICAL';
    else if (rainfall_mm > 25) severity = 'HIGH';
    else if (rainfall_mm > 10) severity = 'MEDIUM';

    return { rainfall_mm, has_storm_alert, severity };
  } catch (err) {
    console.error('Weather service error:', err.message);
    return { rainfall_mm: 0, has_storm_alert: false, severity: 'LOW' };
  }
}

module.exports = { getWeatherData };
