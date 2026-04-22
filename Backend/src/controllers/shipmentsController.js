const supabase = require('../utils/supabaseClient');
const { getRiskScore } = require('../services/mlService');
const { getRoute, getReroute } = require('../services/routingService');
const { computeRisk, alertTypeFromFactor } = require('../services/riskEngine');

// ── Helpers ────────────────────────────────────────────────────────────────

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function createAlert(shipmentId, companyId, fields) {
  const { error } = await supabase.from('alerts').insert({
    shipment_id: shipmentId,
    company_id: companyId,
    ...fields,
  });
  if (error) console.error('Alert insert error:', error.message);
}

// ── Controllers ────────────────────────────────────────────────────────────

async function createShipment(req, res, next) {
  try {
    const { truck_id, driver_name, origin_city, destination_city, cargo_type, departure_time } = req.body;

    if (!truck_id || !origin_city || !destination_city) {
      return res.status(400).json({ error: 'truck_id, origin_city, destination_city are required' });
    }

    // Get planned route
    const routeData = await getRoute(origin_city, destination_city);

    // Estimate arrival: distance / 60 km/h average
    const durationMs = (routeData.duration_minutes || (routeData.distance_km / 60) * 60) * 60 * 1000;
    const departureTs = departure_time ? new Date(departure_time) : new Date();
    const estimated_arrival = new Date(departureTs.getTime() + durationMs).toISOString();

    const { data: shipment, error } = await supabase
      .from('shipments')
      .insert({
        company_id: req.companyId,
        truck_id,
        driver_name,
        origin_city,
        destination_city,
        cargo_type,
        planned_route: routeData.waypoints,
        current_route: routeData.waypoints,
        status: 'IN_TRANSIT',
        departure_time: departureTs.toISOString(),
        estimated_arrival,
      })
      .select()
      .single();

    if (error) throw error;

    // Log initial alert
    await createAlert(shipment.id, req.companyId, {
      alert_type: 'DELIVERY_STARTED',
      severity: 'LOW',
      message: `Shipment from ${origin_city} to ${destination_city} has started.`,
    });

    res.status(201).json(shipment);
  } catch (err) {
    next(err);
  }
}

async function getShipments(req, res, next) {
  try {
    const { status, date_from, date_to } = req.query;

    let query = supabase
      .from('shipments')
      .select('*')
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getActiveShipments(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('id, truck_id, current_lat, current_lng, current_risk_score, status, current_route')
      .eq('company_id', req.companyId)
      .in('status', ['IN_TRANSIT', 'AT_RISK', 'REROUTED']);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getShipment(req, res, next) {
  try {
    const { id } = req.params;

    const [shipmentRes, logsRes, alertsRes] = await Promise.all([
      supabase.from('shipments').select('*').eq('id', id).eq('company_id', req.companyId).single(),
      supabase
        .from('position_logs')
        .select('*')
        .eq('shipment_id', id)
        .order('logged_at', { ascending: false })
        .limit(50),
      supabase
        .from('alerts')
        .select('*')
        .eq('shipment_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (shipmentRes.error) throw shipmentRes.error;

    res.json({
      ...shipmentRes.data,
      position_logs: logsRes.data || [],
      alerts: alertsRes.data || [],
    });
  } catch (err) {
    next(err);
  }
}

async function updatePosition(req, res, next) {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    // Fetch current shipment
    const { data: shipment, error: fetchError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .eq('company_id', req.companyId)
      .single();

    if (fetchError || !shipment) return res.status(404).json({ error: 'Shipment not found' });

    // 1. Log position
    await supabase.from('position_logs').insert({ shipment_id: id, lat, lng });

    // 2. Get ML risk scores
    const mlScores = await getRiskScore(lat, lng);
    const { total_risk, severity, dominant_factor } = computeRisk(mlScores);

    // 3. Base shipment update
    const updatePayload = {
      current_lat: lat,
      current_lng: lng,
      current_risk_score: total_risk,
      weather_risk: mlScores.weather_risk,
      landslide_risk: mlScores.landslide_risk,
      social_risk: mlScores.social_risk,
      updated_at: new Date().toISOString(),
    };

    let alert_fired = false;
    let new_route = shipment.current_route;

    // 4. Risk threshold logic
    if (total_risk >= 80 && shipment.status !== 'REROUTED') {
      // HIGH RISK → reroute
      updatePayload.status = 'AT_RISK';
      await createAlert(id, req.companyId, {
        alert_type: 'HIGH_RISK_ZONE',
        severity: 'CRITICAL',
        message: `High risk zone detected near current position. Risk: ${total_risk.toFixed(1)}%`,
        lat, lng,
        risk_score_at_alert: total_risk,
      });

      const rerouteData = await getReroute(lat, lng, shipment.destination_city);
      new_route = rerouteData.waypoints;

      updatePayload.current_route = new_route;
      updatePayload.status = 'REROUTED';
      updatePayload.reroute_count = (shipment.reroute_count || 0) + 1;

      await createAlert(id, req.companyId, {
        alert_type: 'REROUTE_EXECUTED',
        severity: 'HIGH',
        message: `Shipment rerouted to avoid high risk zone. New safe route calculated.`,
        lat, lng,
        risk_score_at_alert: total_risk,
      });

      await supabase.from('reroute_events').insert({
        shipment_id: id,
        trigger_type: 'AUTOMATIC',
        trigger_reason: `Risk score exceeded 80% threshold (${total_risk.toFixed(1)}%)`,
        old_route: shipment.current_route,
        new_route,
        risk_score_at_trigger: total_risk,
      });

      alert_fired = true;

    } else if (total_risk >= 60) {
      // MEDIUM-HIGH risk — check for recent alert (last 30 min)
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: recentAlerts } = await supabase
        .from('alerts')
        .select('id')
        .eq('shipment_id', id)
        .eq('alert_type', 'WEATHER_WARNING')
        .gte('created_at', thirtyMinAgo)
        .limit(1);

      if (!recentAlerts || recentAlerts.length === 0) {
        const alert_type = alertTypeFromFactor(dominant_factor);
        await createAlert(id, req.companyId, {
          alert_type,
          severity,
          message: `${alert_type.replace(/_/g, ' ')} detected. Risk score: ${total_risk.toFixed(1)}%`,
          lat, lng,
          risk_score_at_alert: total_risk,
        });
        alert_fired = true;
      }

    } else if (total_risk < 40 && shipment.status === 'AT_RISK') {
      // Risk cleared
      updatePayload.status = 'IN_TRANSIT';
    }

    // 5. Arrival check — within 1 km of destination
    const destWaypoints = shipment.current_route;
    if (destWaypoints && destWaypoints.length > 0) {
      const dest = destWaypoints[destWaypoints.length - 1];
      const distToDestKm = haversineKm(lat, lng, dest.lat, dest.lng);

      if (distToDestKm <= 1 && shipment.status !== 'DELIVERED') {
        updatePayload.status = 'DELIVERED';
        updatePayload.actual_arrival = new Date().toISOString();

        await createAlert(id, req.companyId, {
          alert_type: 'DELIVERY_COMPLETED',
          severity: 'LOW',
          message: `Shipment delivered to ${shipment.destination_city}.`,
          lat, lng,
          risk_score_at_alert: total_risk,
        });
        alert_fired = true;
      }
    }

    // 6. Persist updates
    const { error: updateError } = await supabase
      .from('shipments')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) throw updateError;

    // 7. Update position_log with scores
    await supabase
      .from('position_logs')
      .update({
        risk_score: total_risk,
        weather_risk: mlScores.weather_risk,
        landslide_risk: mlScores.landslide_risk,
        social_risk: mlScores.social_risk,
      })
      .eq('shipment_id', id)
      .is('risk_score', null)
      .order('logged_at', { ascending: false })
      .limit(1);

    res.json({
      risk_score: total_risk,
      severity,
      status: updatePayload.status || shipment.status,
      current_route: new_route,
      alert_fired,
    });
  } catch (err) {
    next(err);
  }
}

async function manualReroute(req, res, next) {
  try {
    const { id } = req.params;

    const { data: shipment, error: fetchError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .eq('company_id', req.companyId)
      .single();

    if (fetchError || !shipment) return res.status(404).json({ error: 'Shipment not found' });

    const rerouteData = await getReroute(
      shipment.current_lat,
      shipment.current_lng,
      shipment.destination_city
    );

    const new_route = rerouteData.waypoints;

    const { data: rerouteEvent, error: rerouteError } = await supabase
      .from('reroute_events')
      .insert({
        shipment_id: id,
        trigger_type: 'MANUAL',
        trigger_reason: 'Manual reroute triggered by operator',
        old_route: shipment.current_route,
        new_route,
        risk_score_at_trigger: shipment.current_risk_score,
      })
      .select('id')
      .single();

    if (rerouteError) throw rerouteError;

    await supabase
      .from('shipments')
      .update({
        current_route: new_route,
        status: 'REROUTED',
        reroute_count: (shipment.reroute_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    await createAlert(id, req.companyId, {
      alert_type: 'REROUTE_EXECUTED',
      severity: 'MEDIUM',
      message: 'Manual reroute executed by operator.',
      lat: shipment.current_lat,
      lng: shipment.current_lng,
      risk_score_at_alert: shipment.current_risk_score,
    });

    res.json({ new_route, reroute_event_id: rerouteEvent.id });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createShipment,
  getShipments,
  getActiveShipments,
  getShipment,
  updatePosition,
  manualReroute,
};
