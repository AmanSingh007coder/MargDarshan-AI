/**
 * Weighted risk aggregation.
 * Weights: weather 35%, landslide 45%, social 20%
 */
function computeRisk({ weather_risk, landslide_risk, social_risk }) {
  const total_risk =
    weather_risk * 0.35 +
    landslide_risk * 0.45 +
    social_risk * 0.20;

  let severity;
  if (total_risk >= 80) severity = 'CRITICAL';
  else if (total_risk >= 60) severity = 'HIGH';
  else if (total_risk >= 40) severity = 'MEDIUM';
  else severity = 'LOW';

  // Which factor is driving the risk most?
  const scores = { weather_risk, landslide_risk, social_risk };
  const dominant_factor = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

  return { total_risk: parseFloat(total_risk.toFixed(2)), severity, dominant_factor };
}

/**
 * Maps dominant_factor to an alert_type string.
 */
function alertTypeFromFactor(dominant_factor) {
  const map = {
    weather_risk: 'WEATHER_WARNING',
    landslide_risk: 'LANDSLIDE_RISK',
    social_risk: 'PROTEST_DETECTED',
  };
  return map[dominant_factor] || 'HIGH_RISK_ZONE';
}

module.exports = { computeRisk, alertTypeFromFactor };
