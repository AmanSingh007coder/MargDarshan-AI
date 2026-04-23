import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import L from 'leaflet';
import axios from 'axios';
import { Radio, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../utils/supabase';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ML_URL     = import.meta.env.VITE_ML_URL     || 'http://localhost:8888';
const OSRM_BASE  = 'https://router.project-osrm.org/route/v1/driving';

const SPEED_KMPH = {
  'Heavy Truck (>12T)':   55, 'Medium Truck (3.5–12T)': 60,
  'Light Commercial':     65, 'Refrigerated Vehicle':   55,
  'Tanker':               50, 'Container Truck':        55,
  'Container Ship':       40, 'Bulk Carrier':           26,
  'Tanker (Crude)':       28, 'LNG Carrier':            35,
  'RORO Vessel':          37, 'General Cargo':          26,
  'Tug & Barge':          15,
};

const CORRIDOR_PAIRS = {
  'Mumbai-Pune':         [['Mumbai','Pune'],['Pune','Mumbai']],
  'Pune-Nashik':         [['Pune','Nashik'],['Nashik','Pune']],
  'Mumbai-Goa':          [['Mumbai','Goa'],['Goa','Mumbai']],
  'Bengaluru-Mangaluru': [['Bengaluru','Mangaluru'],['Mangaluru','Bengaluru']],
  'Kochi-Kozhikode':     [['Kochi','Kozhikode'],['Kozhikode','Kochi']],
};
function resolveCorridor(src, dst) {
  for (const [name, pairs] of Object.entries(CORRIDOR_PAIRS))
    if (pairs.some(([o, d]) => o === src && d === dst)) return name;
  return 'Mumbai-Pune';
}

function riskColor(s) {
  if (s >= 80) return '#ef4444';
  if (s >= 60) return '#f97316';
  if (s >= 40) return '#eab308';
  return '#10b981';
}
function riskLabel(s) {
  if (s >= 80) return 'CRITICAL'; if (s >= 60) return 'HIGH';
  if (s >= 40) return 'MEDIUM'; return 'LOW';
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function fetchWaterRoute(src, dst, vesselType) {
  try {
    const { data } = await axios.post(`${ML_URL}/water/smart-route`, {
      origin_lat: src.lat,
      origin_lng: src.lng,
      destination_lat: dst.lat,
      destination_lng: dst.lng,
      vessel_type: vesselType || 'Bulk Carrier',
      quantity_tons: 1,
    }, { timeout: 15000 });
    return data.waypoints.map(w => [w.lat, w.lng]);
  } catch {
    // fallback: coastal exit → offshore route → coastal entry
    const srcExit  = src.lng < 78 ? [[src.lat, src.lng - 0.15]] : [[src.lat, src.lng + 0.15]];
    const dstEntry = dst.lng < 78 ? [[dst.lat, dst.lng - 0.15]] : [[dst.lat, dst.lng + 0.15]];
    const mid = src.lng < 78
      ? [[17.0,73.1],[15.5,73.7],[13.5,74.6],[11.5,75.4],[9.8,75.9],[8.5,76.5],[7.8,77.0],[7.0,77.5],[6.0,78.5],[5.7,80.0],[5.9,81.5],[7.0,82.5],[9.5,83.5],[12.5,84.5],[15.5,85.1]]
      : [[15.5,85.1],[12.5,84.5],[9.5,83.5],[7.0,82.5],[5.9,81.5],[5.7,80.0],[6.0,78.5],[7.0,77.5],[7.8,77.0],[8.5,76.5],[9.8,75.9],[11.5,75.4],[13.5,74.6],[15.5,73.7],[17.0,73.1]];
    const bridge = [...srcExit, ...mid, ...dstEntry];
    const all = [[src.lat,src.lng], ...bridge, [dst.lat,dst.lng]];
    const pts = [];
    for (let i = 0; i < all.length - 1; i++) {
      const [la1,ln1] = all[i], [la2,ln2] = all[i+1];
      for (let j = 0; j < 25; j++) {
        const t = j / 25;
        const st = t * t * (3 - 2 * t);
        pts.push([la1 + (la2 - la1) * st, ln1 + (ln2 - ln1) * st]);
      }
    }
    pts.push(all[all.length - 1]);
    return pts;
  }
}

async function fetchLandRoute(src, dst) {
  try {
    const { data } = await axios.get(
      `${OSRM_BASE}/${src.lng},${src.lat};${dst.lng},${dst.lat}?overview=full&geometries=geojson`,
      { timeout: 8000 }
    );
    return data.routes[0].geometry.coordinates.map(([lng,lat]) => [lat,lng]);
  } catch { return [[src.lat,src.lng],[dst.lat,dst.lng]]; }
}

function getCurrentPosition(waypoints, createdAt, speedKmph, fixedDistanceKm = null) {
  if (!waypoints?.length) return null;
  let waypointKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++)
    waypointKm += haversineKm(waypoints[i][0], waypoints[i][1], waypoints[i+1][0], waypoints[i+1][1]);

  // Use stored distance if available (keeps ETA consistent across route recalculations)
  const totalKm  = fixedDistanceKm || waypointKm;
  const totalMs  = (totalKm / speedKmph) * 3600 * 1000;
  const elapsed  = Date.now() - new Date(createdAt).getTime();
  const progress = Math.min(elapsed / totalMs, 1.0);

  const targetKm = progress * waypointKm;
  let covered = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const segKm = haversineKm(waypoints[i][0], waypoints[i][1], waypoints[i+1][0], waypoints[i+1][1]);
    if (covered + segKm >= targetKm) {
      const t = (targetKm - covered) / segKm;
      const coveredKm = Math.round(progress * totalKm);
      return {
        lat:         waypoints[i][0] + (waypoints[i+1][0] - waypoints[i][0]) * t,
        lng:         waypoints[i][1] + (waypoints[i+1][1] - waypoints[i][1]) * t,
        progress,
        coveredKm,
        totalKm:     Math.round(totalKm),
        remainingKm: Math.round(totalKm - coveredKm),
        etaHours:    (((1 - progress) * totalKm) / speedKmph).toFixed(1),
      };
    }
    covered += segKm;
  }
  return { lat: waypoints.at(-1)[0], lng: waypoints.at(-1)[1], progress: 1, coveredKm: Math.round(totalKm), totalKm: Math.round(totalKm), remainingKm: 0, etaHours: '0' };
}

function makeMarkerIcon(emoji, color) {
  return L.divIcon({
    html: `<div style="font-size:24px;line-height:1;filter:drop-shadow(0 0 8px ${color});">${emoji}</div>`,
    className: '', iconSize: [32,32], iconAnchor: [16,16], popupAnchor: [0,-20],
  });
}

export default function LiveMap() {
  const { shipmentId: preselectedId } = useParams();
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const routeCache   = useRef({});
  const markerRefs   = useRef({});
  const polyRefs     = useRef({});

  const [shipments, setShipments] = useState([]);
  const [positions, setPositions] = useState({});
  const [risks, setRisks]         = useState({});
  const [reroutes, setReroutes]   = useState({});
  const [routeStartTimes, setRouteStartTimes] = useState({});
  const [loading, setLoading]     = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [rerouteLoading, setRerouteLoading] = useState(false);
  const [routesVersion, setRoutesVersion] = useState(0); // bumped after route caching completes

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [20, 78], zoom: 5 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution: '© CartoDB', subdomains: 'abcd', maxZoom: 18 }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const loadShipments = useCallback(async () => {
    const { data } = await supabase
      .from('shipments').select('*').eq('status','in_transit')
      .order('created_at', { ascending: false });
    const list = data || [];
    setShipments(list);
    if (list.length > 0 && !selectedId) {
      // If opened from My Shipments with a specific id, pre-select it
      const target = preselectedId && list.find(s => s.id === preselectedId);
      setSelectedId(target ? target.id : list[0].id);
    }
    setLoading(false);

    await Promise.all(list.map(async s => {
      if (routeCache.current[s.id]) return;
      const wps = s.type === 'water'
        ? await fetchWaterRoute(s.source, s.destination, s.vehicle_type)
        : await fetchLandRoute(s.source, s.destination);
      routeCache.current[s.id] = wps;
    }));
    // Routes are now in the ref — bump version so the position effect re-fires
    setRoutesVersion(v => v + 1);
  }, [selectedId, preselectedId]);

  const updatePositions = useCallback(async () => {
    const newPositions = {};
    const autoFulfill  = [];

    for (const s of shipments) {
      // Use rerouted path if available, otherwise original
      const wps = reroutes[s.id] || routeCache.current[s.id];
      if (!wps) continue;
      const speed = SPEED_KMPH[s.vehicle_type] || 55;

      // If rerouted, calculate from reroute start time; otherwise from shipment creation
      const startTime = routeStartTimes[s.id] || s.created_at;
      const fixedDist = s.route_meta?.distance_km || null;
      const pos = getCurrentPosition(wps, startTime, speed, fixedDist);
      if (!pos) continue;
      newPositions[s.id] = pos;
      if (pos.progress >= 1.0) autoFulfill.push(s.id);
    }
    setPositions(newPositions);

    if (autoFulfill.length) {
      await Promise.all(autoFulfill.map(id =>
        supabase.from('shipments').update({ status:'fulfilled' }).eq('id', id)
      ));
      setShipments(prev => prev.filter(s => !autoFulfill.includes(s.id)));
    }

    const riskUpdates = {};
    await Promise.all(
      shipments
        .filter(s => newPositions[s.id] && s.type === 'land')
        .map(async s => {
          const pos = newPositions[s.id];
          const cor = resolveCorridor(s.source?.name, s.destination?.name);
          try {
            const { data } = await axios.post(`${ML_URL}/predict`,
              { lat: pos.lat, lng: pos.lng, corridor: cor }, { timeout: 4000 });
            riskUpdates[s.id] = { score: data.risk_score, severity: data.severity };
          } catch {
            riskUpdates[s.id] = { score: 0, severity: 'LOW' };
          }
        })
    );
    shipments.filter(s => s.type === 'water').forEach(s => {
      riskUpdates[s.id] = { score: 15, severity: 'LOW' };
    });
    setRisks(riskUpdates);
  }, [shipments, routeStartTimes, reroutes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Show only selected shipment's route with completed/remaining split
    for (const s of shipments) {
      const pos = positions[s.id];
      // Use active route (original or rerouted)
      const currentWps = reroutes[s.id] || routeCache.current[s.id];
      const originalWps = routeCache.current[s.id];
      const isRerouted = !!reroutes[s.id];

      if (s.id === selectedId && currentWps && pos) {
        const isWater  = s.type === 'water';
        const doneColor = isWater ? '#00d9ff' : '#f97316';
        const restColor = isWater ? '#0c4a6e' : '#431407';

        // Draw full route in dark type-specific color (remaining path)
        if (!polyRefs.current[s.id]) {
          const fullPoly = L.polyline(currentWps, { color: restColor, weight: 3, opacity: 0.7 }).addTo(map);
          polyRefs.current[s.id] = fullPoly;
        }

        // Build done waypoints
        const targetKm = pos.coveredKm;
        let covered = 0;
        const donePts = [currentWps[0]];
        for (let i = 1; i < currentWps.length; i++) {
          const seg = haversineKm(currentWps[i-1][0], currentWps[i-1][1], currentWps[i][0], currentWps[i][1]);
          if (covered + seg > targetKm) {
            // Add interpolated point at exact progress position
            const t = (targetKm - covered) / seg;
            donePts.push([
              currentWps[i-1][0] + (currentWps[i][0] - currentWps[i-1][0]) * t,
              currentWps[i-1][1] + (currentWps[i][1] - currentWps[i-1][1]) * t,
            ]);
            break;
          }
          covered += seg;
          donePts.push(currentWps[i]);
        }

        // Draw completed portion in bright color
        if (!polyRefs.current[`${s.id}_done`]) {
          const donePoly = L.polyline(donePts, { color: doneColor, weight: 5, opacity: 1 }).addTo(map);
          polyRefs.current[`${s.id}_done`] = donePoly;
        } else {
          polyRefs.current[`${s.id}_done`].setLatLngs(donePts);
        }

        // Show original route in faded white if rerouted (for reference)
        if (isRerouted && originalWps && !polyRefs.current[`${s.id}_original`]) {
          const origPoly = L.polyline(originalWps, { color: '#94a3b8', weight: 2, opacity: 0.25, dashArray: '5,5' }).addTo(map);
          polyRefs.current[`${s.id}_original`] = origPoly;
        }
      } else {
        // Hide other routes
        ['', '_done', '_original'].forEach(suffix => {
          const key = `${s.id}${suffix}`;
          if (polyRefs.current[key]) {
            map.removeLayer(polyRefs.current[key]);
            delete polyRefs.current[key];
          }
        });
      }
    }

    // Show marker for selected shipment with popup
    const pos  = positions[selectedId];
    const risk = risks[selectedId] || { score: 0, severity: 'LOW' };
    const shipment = shipments.find(s => s.id === selectedId);
    const color = riskColor(risk.score);
    const emoji = shipment?.type === 'water' ? '🚢' : '🚛';

    if (pos && shipment) {
      const reason = getCriticalityReason(risk);
      const hasReroute = reroutes[selectedId];

      const popupHtml = `
        <div style="font-family:monospace;color:#1a1a2e;min-width:240px;font-size:12px">
          <div style="color:#0066cc;font-weight:900;font-size:13px;margin-bottom:4px">${shipment.display_id}</div>
          <div style="color:#333;font-size:11px;margin-bottom:8px">${shipment.source?.name} → ${shipment.destination?.name}</div>
          <div style="margin-bottom:8px;display:flex;gap:6px;align-items:center">
            <span style="background:${color}22;color:${color};border:1px solid ${color}44;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:900">
              ${riskLabel(risk.score)} ${risk.score.toFixed(0)}%
            </span>
            ${hasReroute ? `<span style="background:#10b98122;color:#10b981;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:900">✓ REROUTING</span>` : ''}
          </div>
          ${risk.score >= 60 ? `<div style="color:#dc2626;background:#dc262622;padding:6px;border-radius:4px;margin-bottom:6px;font-size:11px;font-weight:700">⚠ ${reason}</div>` : ''}
          <div style="border-top:1px solid rgba(0,0,0,0.1);padding-top:8px">
            <table style="width:100%;font-size:11px;border-collapse:collapse">
              <tr><td style="color:#555;padding:3px 0;padding-right:12px;font-weight:600">Covered</td><td style="color:#000;text-align:right;font-weight:900">${pos.coveredKm} km</td></tr>
              <tr><td style="color:#555;padding:3px 0;padding-right:12px;font-weight:600">Remaining</td><td style="color:#000;text-align:right;font-weight:900">${pos.remainingKm} km</td></tr>
              <tr><td style="color:#555;padding:3px 0;padding-right:12px;font-weight:600">ETA</td><td style="color:#0066cc;text-align:right;font-weight:900">${pos.etaHours}h</td></tr>
              <tr><td style="color:#555;padding:3px 0;padding-right:12px;font-weight:600">Progress</td><td style="color:#000;text-align:right;font-weight:900">${(pos.progress*100).toFixed(1)}%</td></tr>
              <tr><td style="color:#555;padding:3px 0;padding-right:12px;font-weight:600">Type</td><td style="color:#000;text-align:right;font-weight:900;font-size:10px">${shipment.vehicle_type}</td></tr>
            </table>
          </div>
        </div>`;

      if (markerRefs.current[selectedId]) {
        markerRefs.current[selectedId]
          .setLatLng([pos.lat, pos.lng])
          .setIcon(makeMarkerIcon(emoji, color));
        markerRefs.current[selectedId].getPopup()?.setContent(popupHtml);
      } else {
        const m = L.marker([pos.lat, pos.lng], { icon: makeMarkerIcon(emoji, color) })
          .bindPopup(popupHtml, { maxWidth: 280, closeButton: false })
          .addTo(map);
        markerRefs.current[selectedId] = m;
      }
    }

    // Remove markers for unselected shipments
    for (const id of Object.keys(markerRefs.current)) {
      if (id !== selectedId && markerRefs.current[id]) {
        mapRef.current?.removeLayer(markerRefs.current[id]);
        delete markerRefs.current[id];
      }
    }
  }, [positions, risks, reroutes, shipments, selectedId]);

  const triggerReroute = async (shipmentId) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    const pos = positions[shipmentId];
    if (!shipment || !pos) {
      console.warn('Cannot reroute: shipment or position missing');
      return;
    }

    setRerouteLoading(true);
    try {
      const corridor = resolveCorridor(shipment.source?.name, shipment.destination?.name);
      console.log(`📍 Rerouting from (${pos.lat.toFixed(2)}, ${pos.lng.toFixed(2)}) to ${shipment.destination?.name}`);
      const { data } = await axios.post(`${ML_URL}/reroute`, {
        current_lat: pos.lat,
        current_lng: pos.lng,
        destination_city: shipment.destination?.name,
        corridor,
      }, { timeout: 8000 });

      if (!data.new_route || data.new_route.length < 2) {
        console.warn('Reroute returned invalid route');
        return;
      }

      // Ensure waypoints are in correct format [lat, lng]
      const formattedWaypoints = data.new_route.map(w =>
        Array.isArray(w) ? w : [w.lat, w.lng]
      );

      console.log(`✓ Reroute successful: ${formattedWaypoints.length} waypoints, distance: ${data.distance_km}km`);

      // **Store reroute (shipment now uses this path)**
      setReroutes(prev => ({ ...prev, [shipmentId]: formattedWaypoints }));
      // **Set route start time to now (recalculate ETA from reroute point)**
      setRouteStartTimes(prev => ({ ...prev, [shipmentId]: new Date().toISOString() }));

      console.log(`🔄 Shipment ${shipmentId} now traveling on rerouted path`);
    } catch (err) {
      console.error('❌ Reroute failed:', err.message);
    } finally {
      setRerouteLoading(false);
    }
  };

  const getCriticalityReason = (risk) => {
    if (!risk) return 'High risk zone';

    const breakdown = risk.breakdown || {};
    let factors = [
      { name: 'Landslide detected', score: parseFloat(breakdown.landslide_risk) || 0 },
      { name: 'Protest zone', score: parseFloat(breakdown.protest_risk) || 0 },
      { name: 'Severe weather', score: parseFloat(breakdown.weather_risk) || 0 },
      { name: 'Traffic congestion', score: parseFloat(breakdown.traffic_risk) || 0 },
    ];

    // Boost score if static factors detected
    if (risk.landslide_nearby) {
      factors[0].score = Math.max(factors[0].score, 35);
    }
    if (risk.protest_severity && risk.protest_severity > 0) {
      factors[1].score = Math.max(factors[1].score, Math.ceil(risk.protest_severity * 7));
    }

    // Check if any factor has meaningful score
    const topFactor = factors.sort((a, b) => b.score - a.score)[0];
    if (topFactor && topFactor.score > 0) {
      return topFactor.name;
    }

    // Fallback: if no breakdown but risk is high, suggest based on model's internal assessment
    if (risk.score > 80) {
      // Different reasons based on risk patterns
      if (risk.severity === 'CRITICAL') {
        return 'Critical route conditions detected';
      }
      return 'High-risk corridor area';
    }

    return 'High risk zone';
  };

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  // Auto-reroute when risk > 80 (immediately trigger reroute)
  useEffect(() => {
    for (const [shipmentId, risk] of Object.entries(risks)) {
      if (risk && risk.score > 80 && !reroutes[shipmentId] && !rerouteLoading) {
        console.log(`🚨 Critical risk detected for ${shipmentId}: ${risk.score}% - Triggering reroute`);
        triggerReroute(shipmentId);
      }
    }
  }, [risks, reroutes, rerouteLoading, triggerReroute]);

  useEffect(() => {
    if (!shipments.length) return;
    updatePositions();
    const t = setInterval(updatePositions, 30_000);
    return () => clearInterval(t);
  }, [shipments, updatePositions, routesVersion]);

  const activeCount    = shipments.length;
  const criticalCount  = Object.values(risks).filter(r => r.score >= 80).length;
  const selectedShip   = shipments.find(s => s.id === selectedId);
  const selectedPos    = selectedId ? positions[selectedId] : null;
  const selectedRisk   = selectedId ? (risks[selectedId] || { score: 0, severity: 'LOW' }) : null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
            <Radio size={20} className="text-emerald-400 animate-pulse" /> Live Fleet Map
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {activeCount} active shipment{activeCount !== 1 ? 's' : ''} · click a card to select
            {criticalCount > 0 && <span className="text-red-400 ml-2">· {criticalCount} critical risk</span>}
          </p>
        </div>
        <button onClick={() => { loadShipments().then(updatePositions); }}
          className="p-2 text-slate-500 hover:text-white transition rounded-xl hover:bg-white/5">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {criticalCount > 0 && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
          <AlertTriangle size={16} /> {criticalCount} shipment{criticalCount>1?'s':''} at CRITICAL risk. Check Live Map immediately.
        </div>
      )}

      {selectedShip && selectedRisk && selectedRisk.score >= 60 && reroutes[selectedId] && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">Rerouting active</span>
        </div>
      )}

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-white/5" style={{ height: '75vh' }}>
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Clickable cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading && <p className="text-slate-500 text-sm col-span-full">Loading shipments…</p>}
        {!loading && !activeCount && (
          <p className="text-slate-600 text-sm col-span-full text-center py-4">No active shipments. <a href="/dashboard/new-shipment" className="text-cyan-400 underline">Create one.</a></p>
        )}
        {shipments.map(s => (
          <button key={s.id} onClick={() => setSelectedId(s.id)}
            className={`text-left bg-[#050810] border rounded-2xl p-4 transition-all ${
              selectedId === s.id
                ? 'border-cyan-500 bg-cyan-500/5 ring-1 ring-cyan-500/30'
                : 'border-white/5 hover:border-white/10'
            }`}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-cyan-400 font-mono font-black text-sm">{s.display_id}</p>
              {reroutes[s.id] && (
                <span className="text-[8px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-black">REROUTED</span>
              )}
            </div>
            <p className="text-white text-xs font-bold mb-1">{s.source?.name} → {s.destination?.name}</p>
            <p className="text-slate-500 text-[10px]">{s.vehicle_type}</p>
            {risks[s.id] && risks[s.id].score > 80 && (
              <p className="text-red-400 text-[10px] mt-2">🚨 Critical risk detected</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
