const supabase = require('../utils/supabaseClient');

async function getAnalytics(req, res, next) {
  try {
    const companyId = req.companyId;

    // Fetch all shipments for the company
    const { data: shipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select('id, origin_city, destination_city, status, reroute_count, created_at')
      .eq('company_id', companyId);

    if (shipmentsError) throw shipmentsError;

    // Fetch all alerts for the company
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('alert_type, created_at')
      .eq('company_id', companyId);

    if (alertsError) throw alertsError;

    // Fetch position logs for risk averaging
    const shipmentIds = shipments.map(s => s.id);

    let avgRiskScore = 0;
    if (shipmentIds.length > 0) {
      const { data: logs } = await supabase
        .from('position_logs')
        .select('risk_score')
        .in('shipment_id', shipmentIds)
        .not('risk_score', 'is', null);

      if (logs && logs.length > 0) {
        const total = logs.reduce((sum, l) => sum + (l.risk_score || 0), 0);
        avgRiskScore = parseFloat((total / logs.length).toFixed(2));
      }
    }

    // Basic counts
    const total_shipments = shipments.length;
    const on_time_deliveries = shipments.filter(s => s.status === 'DELIVERED').length;
    const delayed_deliveries = shipments.filter(s => s.status === 'DELAYED').length;
    const total_reroutes = shipments.reduce((sum, s) => sum + (s.reroute_count || 0), 0);

    // Alert type distribution
    const alert_type_distribution = {};
    for (const alert of alerts) {
      alert_type_distribution[alert.alert_type] = (alert_type_distribution[alert.alert_type] || 0) + 1;
    }

    // Risk by route
    const routeMap = {};
    for (const shipment of shipments) {
      const routeKey = `${shipment.origin_city}-${shipment.destination_city}`;
      if (!routeMap[routeKey]) routeMap[routeKey] = [];
    }

    if (shipmentIds.length > 0) {
      const { data: routeLogs } = await supabase
        .from('position_logs')
        .select('shipment_id, risk_score')
        .in('shipment_id', shipmentIds)
        .not('risk_score', 'is', null);

      if (routeLogs) {
        const shipmentRouteMap = {};
        for (const s of shipments) {
          shipmentRouteMap[s.id] = `${s.origin_city}-${s.destination_city}`;
        }
        for (const log of routeLogs) {
          const routeKey = shipmentRouteMap[log.shipment_id];
          if (routeKey) {
            if (!routeMap[routeKey]) routeMap[routeKey] = [];
            routeMap[routeKey].push(log.risk_score);
          }
        }
      }
    }

    const risk_by_route = Object.entries(routeMap).map(([route, scores]) => ({
      route,
      avg_risk: scores.length
        ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : 0,
    }));

    // Weekly performance (last 4 weeks)
    const weekly_performance = buildWeeklyPerformance(shipments);

    res.json({
      total_shipments,
      on_time_deliveries,
      delayed_deliveries,
      total_reroutes,
      avg_risk_score: avgRiskScore,
      alert_type_distribution,
      risk_by_route,
      weekly_performance,
    });
  } catch (err) {
    next(err);
  }
}

function buildWeeklyPerformance(shipments) {
  const weeks = {};
  for (const s of shipments) {
    const date = new Date(s.created_at);
    const weekNum = getWeekNumber(date);
    const key = `Week ${weekNum}`;
    if (!weeks[key]) weeks[key] = { week: key, on_time: 0, delayed: 0 };
    if (s.status === 'DELIVERED') weeks[key].on_time++;
    if (s.status === 'DELAYED') weeks[key].delayed++;
  }
  return Object.values(weeks).slice(-4);
}

function getWeekNumber(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date - startOfYear;
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

module.exports = { getAnalytics };
