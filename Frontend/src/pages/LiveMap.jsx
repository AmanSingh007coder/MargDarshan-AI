import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, useCallback } from 'react';
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

const ML_URL     = import.meta.env.VITE_ML_URL     || 'http://localhost:8000';
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

function buildSeaBridge(srcLat, srcLng, dstLat, dstLng) {
  const srcWest = srcLng < 78 && srcLat > 7;
  const dstEast = dstLng > 79 && dstLat > 7;
  const srcEast = srcLng > 79 && srcLat > 7;
  const dstWest = dstLng < 78 && dstLat > 7;
  if (!(( srcWest && dstEast) || (srcEast && dstWest))) return [];
  return srcWest
    ? [[8.2,76.5],[6.5,77.2],[5.6,79.2],[7.5,81.5]]
    : [[7.5,81.5],[5.6,79.2],[6.5,77.2],[8.2,76.5]];
}
function seaWaypoints(srcLat, srcLng, dstLat, dstLng) {
  const bridge = buildSeaBridge(srcLat, srcLng, dstLat, dstLng);
  const all = [[srcLat,srcLng], ...bridge, [dstLat,dstLng]];
  const pts = [];
  for (let i = 0; i < all.length - 1; i++) {
    const [la1,ln1] = all[i], [la2,ln2] = all[i+1];
    for (let j = 0; j < 20; j++) { const t=j/20; pts.push([la1+(la2-la1)*t, ln1+(ln2-ln1)*t]); }
  }
  pts.push(all[all.length-1]);
  return pts;
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

function getCurrentPosition(waypoints, createdAt, speedKmph) {
  if (!waypoints?.length) return null;
  let totalKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++)
    totalKm += haversineKm(waypoints[i][0], waypoints[i][1], waypoints[i+1][0], waypoints[i+1][1]);

  const totalMs  = (totalKm / speedKmph) * 3600 * 1000;
  const elapsed  = Date.now() - new Date(createdAt).getTime();
  const progress = Math.min(elapsed / totalMs, 1.0);

  const targetKm = progress * totalKm;
  let covered = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const segKm = haversineKm(waypoints[i][0], waypoints[i][1], waypoints[i+1][0], waypoints[i+1][1]);
    if (covered + segKm >= targetKm) {
      const t = (targetKm - covered) / segKm;
      return {
        lat:      waypoints[i][0] + (waypoints[i+1][0] - waypoints[i][0]) * t,
        lng:      waypoints[i][1] + (waypoints[i+1][1] - waypoints[i][1]) * t,
        progress,
        coveredKm: Math.round(targetKm),
        totalKm:   Math.round(totalKm),
        remainingKm: Math.round(totalKm - targetKm),
        etaHours:  ((totalKm - targetKm) / speedKmph).toFixed(1),
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
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const routeCache   = useRef({});
  const markerRefs   = useRef({});
  const polyRefs     = useRef({});

  const [shipments, setShipments] = useState([]);
  const [positions, setPositions] = useState({});
  const [risks, setRisks]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [selectedId, setSelectedId] = useState(null);

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
    if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
    setLoading(false);

    await Promise.all(list.map(async s => {
      if (routeCache.current[s.id]) return;
      const wps = s.type === 'water'
        ? seaWaypoints(s.source.lat, s.source.lng, s.destination.lat, s.destination.lng)
        : await fetchLandRoute(s.source, s.destination);
      routeCache.current[s.id] = wps;
    }));
  }, [selectedId]);

  const updatePositions = useCallback(async () => {
    const newPositions = {};
    const autoFulfill  = [];

    for (const s of shipments) {
      const wps = routeCache.current[s.id];
      if (!wps) continue;
      const speed = SPEED_KMPH[s.vehicle_type] || 55;
      const pos = getCurrentPosition(wps, s.created_at, speed);
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
  }, [shipments]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Show only selected shipment's route with completed/remaining split
    for (const s of shipments) {
      const wps = routeCache.current[s.id];
      const pos = positions[s.id];

      if (s.id === selectedId && wps && pos) {
        // Draw full route in faded color (remaining path)
        if (!polyRefs.current[s.id]) {
          const fullPoly = L.polyline(wps, { color: 'rgba(6,182,212,0.2)', weight: 2 }).addTo(map);
          polyRefs.current[s.id] = fullPoly;
        }

        // Draw completed portion in bright cyan
        if (!polyRefs.current[`${s.id}_done`]) {
          const totalKm = wps.reduce((acc, _, i) =>
            i === 0 ? acc : acc + haversineKm(wps[i-1][0], wps[i-1][1], wps[i][0], wps[i][1]), 0);
          const targetKm = pos.coveredKm;
          let covered = 0;
          const donePts = [wps[0]];
          for (let i = 1; i < wps.length; i++) {
            const seg = haversineKm(wps[i-1][0],wps[i-1][1],wps[i][0],wps[i][1]);
            if (covered + seg > targetKm) break;
            covered += seg;
            donePts.push(wps[i]);
          }
          const donePoly = L.polyline(donePts, { color: '#06b6d4', weight: 4, opacity: 0.9 }).addTo(map);
          polyRefs.current[`${s.id}_done`] = donePoly;
        } else {
          // Update completed portion as shipment moves
          const totalKm = wps.reduce((acc, _, i) =>
            i === 0 ? acc : acc + haversineKm(wps[i-1][0], wps[i-1][1], wps[i][0], wps[i][1]), 0);
          const targetKm = pos.coveredKm;
          let covered = 0;
          const donePts = [wps[0]];
          for (let i = 1; i < wps.length; i++) {
            const seg = haversineKm(wps[i-1][0],wps[i-1][1],wps[i][0],wps[i][1]);
            if (covered + seg > targetKm) break;
            covered += seg;
            donePts.push(wps[i]);
          }
          polyRefs.current[`${s.id}_done`].setLatLngs(donePts);
        }
      } else {
        // Hide other routes
        if (polyRefs.current[s.id]) {
          map.removeLayer(polyRefs.current[s.id]);
          delete polyRefs.current[s.id];
        }
        if (polyRefs.current[`${s.id}_done`]) {
          map.removeLayer(polyRefs.current[`${s.id}_done`]);
          delete polyRefs.current[`${s.id}_done`];
        }
      }
    }

    // Show marker for selected shipment with popup
    const pos  = positions[selectedId];
    const risk = risks[selectedId] || { score: 0, severity: 'LOW' };
    const shipment = shipments.find(s => s.id === selectedId);
    const color = riskColor(risk.score);
    const emoji = shipment?.type === 'water' ? '🚢' : '🚛';

    if (pos && shipment) {
      const popupHtml = `
        <div style="font-family:monospace;color:#1a1a2e;min-width:220px;font-size:12px">
          <div style="color:#0066cc;font-weight:900;font-size:13px;margin-bottom:6px">${shipment.display_id}</div>
          <div style="color:#333;font-size:11px;margin-bottom:8px">${shipment.source?.name} → ${shipment.destination?.name}</div>
          <div style="margin-bottom:8px">
            <span style="background:${color}22;color:${color};border:1px solid ${color}44;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:900">
              ${riskLabel(risk.score)} ${risk.score.toFixed(0)}%
            </span>
          </div>
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
          .bindPopup(popupHtml, { maxWidth: 260, closeButton: false })
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
  }, [positions, risks, shipments, selectedId]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  useEffect(() => {
    if (!shipments.length) return;
    updatePositions();
    const t = setInterval(updatePositions, 30_000);
    return () => clearInterval(t);
  }, [shipments, updatePositions]);

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
          <AlertTriangle size={16} /> {criticalCount} shipment{criticalCount>1?'s':''} at CRITICAL risk — check Live Map immediately.
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
            <p className="text-cyan-400 font-mono font-black text-sm mb-2">{s.display_id}</p>
            <p className="text-white text-xs font-bold mb-1">{s.source?.name} → {s.destination?.name}</p>
            <p className="text-slate-500 text-[10px]">{s.vehicle_type}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
