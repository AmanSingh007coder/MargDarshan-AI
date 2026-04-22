import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import axios from 'axios';
import {
  Anchor, Wind, Waves, ArrowLeft, Loader2,
  Ship, Flag, AlertTriangle, MapPin, Fuel, Clock, Trash2,
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import { generateDisplayId } from '../utils/idGenerator';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Naval bases & ports (markers only, no lanes) ────────────────────────────

const NAVAL_BASES = [
  { name: 'INS Shivaji (Mumbai)',    lat: 18.9667, lng: 72.8333 },
  { name: 'INS Kadamba (Karwar)',    lat: 14.8136, lng: 74.1280 },
  { name: 'INS Venduruthy (Kochi)', lat:  9.9312, lng: 76.2673 },
  { name: 'HQENC (Visakhapatnam)', lat: 17.6868, lng: 83.2185 },
  { name: 'INS Jarawa (Port Blair)',lat: 11.6234, lng: 92.7265 },
];

const PORTS = [
  { name: 'Mumbai Port',          lat: 18.9399, lng: 72.8355 },
  { name: 'Chennai Port',         lat: 13.0827, lng: 80.2707 },
  { name: 'Kochi Port',           lat:  9.9312, lng: 76.2673 },
  { name: 'Mormugao Port (Goa)', lat: 15.4189, lng: 73.7975 },
  { name: 'Colombo Port',         lat:  6.9271, lng: 79.8612 },
  { name: 'Singapore Port',       lat:  1.2897, lng: 103.8501 },
  { name: 'Jebel Ali (Dubai)',    lat: 24.9878, lng: 55.0561 },
];

const VESSEL_TYPES = [
  'Container Ship', 'Bulk Carrier', 'Tanker (Crude)',
  'LNG Carrier', 'RORO Vessel', 'General Cargo', 'Tug & Barge',
];
const VESSEL_SPEEDS = {
  'Container Ship': 22, 'Bulk Carrier': 14, 'Tanker (Crude)': 15,
  'LNG Carrier': 19,   'RORO Vessel': 20,  'General Cargo': 14, 'Tug & Barge': 8,
};

// ── Sea routing ─────────────────────────────────────────────────────────────
// Routes through open water, avoiding the Indian subcontinent and Sri Lanka.

function buildSeaBridge(srcLat, srcLng, dstLat, dstLng) {
  // Determine which side of India each point is on (west=Arabian Sea, east=Bay of Bengal)
  const srcWest = srcLng < 78 && srcLat > 7;
  const dstWest = dstLng < 78 && dstLat > 7;
  const srcEast = srcLng > 79 && srcLat > 7;
  const dstEast = dstLng > 79 && dstLat > 7;

  const crossesIndia = (srcWest && dstEast) || (srcEast && dstWest);
  if (!crossesIndia) return [];

  // Route around the southern tip of India and Sri Lanka
  if (srcWest) {
    // West → East: dive south, pass below Sri Lanka, come up east
    return [
      [8.2, 76.5],  // approach south tip (west side)
      [6.5, 77.2],  // Cape Comorin area (south of India tip)
      [5.6, 79.2],  // south of Sri Lanka
      [7.5, 81.5],  // northeast of Sri Lanka
    ];
  } else {
    // East → West
    return [
      [7.5, 81.5],
      [5.6, 79.2],
      [6.5, 77.2],
      [8.2, 76.5],
    ];
  }
}

function seaRoute(srcLat, srcLng, dstLat, dstLng) {
  const bridge = buildSeaBridge(srcLat, srcLng, dstLat, dstLng);
  const allPts  = [[srcLat, srcLng], ...bridge, [dstLat, dstLng]];

  // Interpolate smooth arc between each segment
  const result = [];
  for (let i = 0; i < allPts.length - 1; i++) {
    const [la1, ln1] = allPts[i];
    const [la2, ln2] = allPts[i + 1];
    const steps = 15;
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      result.push([la1 + (la2 - la1) * t, ln1 + (ln2 - ln1) * t]);
    }
  }
  result.push(allPts[allPts.length - 1]);
  return result;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Icons ────────────────────────────────────────────────────────────────────

const NAVAL_ICON = L.divIcon({
  html: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="12" fill="#1e3a5f" stroke="#38bdf8" stroke-width="2"/>
    <path d="M14 6v8M10 18h8l-4-4-4 4z" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
});

const PORT_ICON = L.divIcon({
  html: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="12" fill="#0f2a1e" stroke="#10b981" stroke-width="2"/>
    <rect x="11" y="9" width="6" height="10" rx="1" fill="none" stroke="#10b981" stroke-width="1.5"/>
    <line x1="8" y1="19" x2="20" y2="19" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
});

const WP_ICON = L.divIcon({
  html: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="8" fill="#7c3aed" stroke="#a78bfa" stroke-width="2"/>
    <circle cx="12" cy="12" r="3" fill="#a78bfa"/>
  </svg>`,
  className: '', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12],
});

// ── Weather strip ─────────────────────────────────────────────────────────────

function WeatherStrip({ lat, lng }) {
  const [w, setW] = useState(null);
  useEffect(() => {
    if (!lat || !lng) return;
    axios.get(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
      `&current=wave_height,ocean_current_velocity,wave_direction`,
      { timeout: 6000 }
    ).then(r => setW(r.data.current)).catch(() => {});
  }, [lat, lng]);

  if (!w) return null;
  return (
    <div className="flex gap-3 text-xs text-slate-400 mt-2">
      <span className="flex items-center gap-1"><Waves size={11} className="text-cyan-400" /> {w.wave_height?.toFixed(1) ?? '—'}m</span>
      <span className="flex items-center gap-1"><Wind size={11} className="text-sky-400" /> {w.ocean_current_velocity?.toFixed(1) ?? '—'} kt</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function WaterShipment() {
  const navigate      = useNavigate();
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);

  const [vesselType, setVesselType]   = useState(VESSEL_TYPES[0]);
  const [waypoints, setWaypoints]     = useState([]);
  const [totalDist, setTotalDist]     = useState(0);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [weatherPos, setWeatherPos]   = useState(null);
  const [mapReady, setMapReady]       = useState(false);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { center: [12, 72], zoom: 5 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution: '© CartoDB', subdomains: 'abcd', maxZoom: 19 }).addTo(map);

    NAVAL_BASES.forEach(b =>
      L.marker([b.lat, b.lng], { icon: NAVAL_ICON })
        .bindPopup(`<b style="color:#38bdf8;font-family:monospace">${b.name}</b><br><small style="color:#94a3b8">Naval Base</small>`)
        .addTo(map)
    );
    PORTS.forEach(p =>
      L.marker([p.lat, p.lng], { icon: PORT_ICON })
        .bindPopup(`<b style="color:#10b981;font-family:monospace">${p.name}</b><br><small style="color:#94a3b8">Port</small>`)
        .addTo(map)
    );

    map.on('click', e => {
      const { lat, lng } = e.latlng;
      setWeatherPos({ lat: +lat.toFixed(3), lng: +lng.toFixed(3) });
      setWaypoints(prev => [...prev, {
        lat: +lat.toFixed(4), lng: +lng.toFixed(4),
        name: `WP ${prev.length + 1}`,
      }]);
    });

    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Sync waypoints + sea route on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.eachLayer(l => { if (l._isWP || l._isRoute) map.removeLayer(l); });

    waypoints.forEach(wp => {
      const m = L.marker([wp.lat, wp.lng], { icon: WP_ICON });
      m._isWP = true;
      m.bindPopup(`<span style="font-family:monospace;color:#a78bfa">${wp.name}<br>${wp.lat}, ${wp.lng}</span>`);
      m.addTo(map);
    });

    if (waypoints.length >= 2) {
      let dist = 0;
      for (let i = 0; i < waypoints.length - 1; i++) {
        const a = waypoints[i], b = waypoints[i + 1];
        const coords = seaRoute(a.lat, a.lng, b.lat, b.lng);
        // sum actual routed distance segment by segment
        for (let j = 0; j < coords.length - 1; j++) {
          dist += haversineKm(coords[j][0], coords[j][1], coords[j+1][0], coords[j+1][1]);
        }
        const poly = L.polyline(coords, { color: '#06b6d4', weight: 3, opacity: 0.9 });
        poly._isRoute = true;
        poly.addTo(map);
      }
      setTotalDist(Math.round(dist));
    } else {
      setTotalDist(0);
    }
  }, [waypoints]);

  const removeWaypoint = useCallback(idx => setWaypoints(p => p.filter((_, i) => i !== idx)), []);

  const nm        = Math.round(totalDist * 0.539957);
  const speed     = VESSEL_SPEEDS[vesselType] || 15;
  const etaHours  = nm > 0 ? (nm / speed).toFixed(1) : 0;
  const fuelTons  = totalDist > 0 ? Math.round(totalDist * 0.018) : 0;

  const handleSave = async () => {
    if (waypoints.length < 2) { setError('Add at least 2 waypoints.'); return; }
    setError(''); setSaving(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Not authenticated.');

      const src = waypoints[0], dst = waypoints[waypoints.length - 1];
      const { error: dbErr } = await supabase.from('shipments').insert({
        display_id:   generateDisplayId(),
        user_id:      user.id,
        type:         'water',
        vehicle_type: vesselType,
        source:       { name: src.name, lat: src.lat, lng: src.lng },
        destination:  { name: dst.name, lat: dst.lat, lng: dst.lng },
        status:       'in_transit',
        current_step: 0,
      });
      if (dbErr) throw dbErr;
      navigate('/dashboard/map');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] -m-8 flex">
      {/* Panel */}
      <div className="w-72 bg-black/80 backdrop-blur-md border-r border-white/10 flex flex-col z-10 overflow-y-auto shrink-0">
        <div className="p-4 border-b border-white/10">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-white text-xs mb-3 transition">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-xl"><Ship size={18} className="text-cyan-400" /></div>
            <div>
              <p className="text-white font-black text-sm uppercase tracking-tight">Naval Route Planner</p>
              <p className="text-slate-500 text-[10px]">Click map to place waypoints</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-white/10 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vessel Type</label>
          <select value={vesselType} onChange={e => setVesselType(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-white text-sm focus:border-cyan-500 outline-none">
            {VESSEL_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <p className="text-slate-500 text-[10px]">Speed: <span className="text-cyan-400">{speed} knots</span></p>
        </div>

        <div className="p-4 border-b border-white/10 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Waypoints ({waypoints.length})</p>
            {waypoints.length > 0 && (
              <button onClick={() => setWaypoints([])} className="text-red-400 hover:text-red-300"><Trash2 size={12} /></button>
            )}
          </div>
          {waypoints.length === 0 && <p className="text-slate-600 text-xs text-center py-4">Click the map to add waypoints</p>}
          <div className="space-y-1.5">
            {waypoints.map((wp, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                <span className="text-purple-400 font-mono text-xs font-black w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold">{wp.name}</p>
                  <p className="text-slate-500 text-[10px] font-mono">{wp.lat}, {wp.lng}</p>
                </div>
                <button onClick={() => removeWaypoint(i)} className="text-slate-600 hover:text-red-400 shrink-0"><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
        </div>

        {totalDist > 0 && (
          <div className="p-4 border-b border-white/10">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2 text-center">
                <MapPin size={11} className="text-cyan-400 mx-auto mb-1" />
                <p className="text-white font-black text-sm">{nm}</p>
                <p className="text-slate-500 text-[9px]">NM</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2 text-center">
                <Clock size={11} className="text-sky-400 mx-auto mb-1" />
                <p className="text-white font-black text-sm">{etaHours}h</p>
                <p className="text-slate-500 text-[9px]">ETA</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2 text-center">
                <Fuel size={11} className="text-amber-400 mx-auto mb-1" />
                <p className="text-white font-black text-sm">{fuelTons}t</p>
                <p className="text-slate-500 text-[9px]">HFO</p>
              </div>
            </div>
            {weatherPos && <WeatherStrip lat={weatherPos.lat} lng={weatherPos.lng} />}
          </div>
        )}

        <div className="p-4">
          {error && <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-3"><AlertTriangle size={12} />{error}</div>}
          <button onClick={handleSave} disabled={saving || waypoints.length < 2}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-black py-3 rounded-xl text-sm uppercase tracking-widest transition flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={15} className="animate-spin" />Saving…</> : <><Flag size={15} />Save Route</>}
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#020617]/80 z-[500]">
            <Loader2 size={28} className="text-cyan-400 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
