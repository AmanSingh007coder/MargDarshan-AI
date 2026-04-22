import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Play, Pause, ChevronRight, Flag, ArrowLeft,
  Loader2, AlertTriangle, RefreshCw, Star,
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import useSimulationStore from '../store/useSimulationStore';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ML_URL = import.meta.env.VITE_ML_URL || 'http://localhost:8000';
const OSRM_BASE    = 'https://router.project-osrm.org/route/v1/driving';

const STEP_DELAY   = { 1: 900, 2: 450, 5: 180, 10: 90 };

// Colour assigned to each route option on the map
const ROUTE_COLORS = ['#06b6d4', '#f97316', '#a855f7'];

// ─────────────────────────────────────────────────────────────────────────────
// Corridor resolver  (mirrors backend mlService.js)
// ─────────────────────────────────────────────────────────────────────────────

const CORRIDOR_PAIRS = {
  'Mumbai-Pune':         [['Mumbai','Pune'],['Pune','Mumbai']],
  'Pune-Nashik':         [['Pune','Nashik'],['Nashik','Pune']],
  'Mumbai-Goa':          [['Mumbai','Goa'],['Goa','Mumbai'],['Mumbai','Panaji']],
  'Bengaluru-Mangaluru': [['Bengaluru','Mangaluru'],['Bangalore','Mangalore'],
                          ['Mangaluru','Bengaluru'],['Mangalore','Bangalore']],
  'Kochi-Kozhikode':     [['Kochi','Kozhikode'],['Kozhikode','Kochi'],
                          ['Cochin','Calicut'],['Calicut','Cochin']],
};

function resolveCorridor(src, dst) {
  for (const [name, pairs] of Object.entries(CORRIDOR_PAIRS)) {
    if (pairs.some(([o, d]) => o === src && d === dst)) return name;
  }
  return 'Mumbai-Pune';
}

// ─────────────────────────────────────────────────────────────────────────────
// Route helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseOSRM(route) {
  return {
    waypoints:    route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distance_km:  Math.round(route.distance / 1000),
    duration_min: Math.round(route.duration / 60),
  };
}

async function fetchAlternatives(src, dst) {
  const coord = `${src.lng},${src.lat};${dst.lng},${dst.lat}`;
  const { data } = await axios.get(
    `${OSRM_BASE}/${coord}?overview=full&geometries=geojson&alternatives=true`,
    { timeout: 10000 },
  );

  const routes = data.routes.map(parseOSRM);

  // If OSRM returned only one route, generate a synthetic alternative by routing
  // through a mid-point that is offset ~10 km perpendicular to the main road.
  if (routes.length < 2) {
    const mid = data.routes[0].geometry.coordinates;
    const midPt = mid[Math.floor(mid.length / 2)];
    try {
      const altCoord = `${src.lng},${src.lat};${midPt[0] + 0.12},${midPt[1] + 0.08};${dst.lng},${dst.lat}`;
      const { data: alt } = await axios.get(
        `${OSRM_BASE}/${altCoord}?overview=full&geometries=geojson`,
        { timeout: 10000 },
      );
      routes.push(parseOSRM(alt.routes[0]));
    } catch { /* silently skip */ }
  }

  return routes;
}

// Score a route by sampling ≤8 evenly-spaced points and averaging their risk.
async function scoreRoute(waypoints, corridor) {
  const step    = Math.max(1, Math.floor(waypoints.length / 8));
  const samples = waypoints.filter((_, i) => i % step === 0).slice(0, 8);

  const scores = await Promise.all(
    samples.map(({ lat, lng }) =>
      axios.post(`${ML_URL}/predict`, { lat, lng, corridor }, { timeout: 5000 })
        .then(r => r.data.risk_score)
        .catch(() => 0),
    ),
  );

  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function riskColor(s) {
  if (s >= 80) return '#ef4444';
  if (s >= 60) return '#f97316';
  if (s >= 40) return '#eab308';
  return '#10b981';
}

const SEV_STYLE = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
  HIGH:     'text-orange-400 bg-orange-500/10 border-orange-500/30',
  MEDIUM:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  LOW:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

function RiskGauge({ score, severity }) {
  const R = 38, C = 2 * Math.PI * R;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
        <circle cx={48} cy={48} r={R} fill="none"
          stroke={riskColor(score)} strokeWidth={8}
          strokeDasharray={C} strokeDashoffset={C - (score / 100) * C}
          strokeLinecap="round" transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease' }}
        />
        <text x={48} y={52} textAnchor="middle" fill="white" fontSize={18} fontWeight={900}>
          {score.toFixed(0)}
        </text>
      </svg>
      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${SEV_STYLE[severity] || SEV_STYLE.LOW}`}>
        {severity}
      </span>
    </div>
  );
}

function RiskBar({ score }) {
  const color = riskColor(score);
  const label = score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MED' : 'LOW';
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] font-black w-14 text-right" style={{ color }}>
        {score.toFixed(0)}% {label}
      </span>
    </div>
  );
}

function formatDuration(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipment list (no ID)
// ─────────────────────────────────────────────────────────────────────────────

function ShipmentList() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    supabase.from('shipments').select('id,display_id,vehicle_type,source,destination,status')
      .eq('status', 'in_transit').order('created_at', { ascending: false })
      .then(({ data }) => { setShipments(data || []); setLoading(false); });
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Active Shipments</h1>
      {loading && <p className="text-slate-500 text-sm">Loading…</p>}
      {!loading && !shipments.length && (
        <p className="text-slate-500 text-sm">No in-transit shipments.{' '}
          <Link to="/dashboard/new-shipment" className="text-cyan-400 underline">Create one.</Link>
        </p>
      )}
      <div className="space-y-3">
        {shipments.map(s => (
          <Link key={s.id} to={`/tracker/${s.id}`}
            className="flex items-center justify-between bg-[#050810] border border-white/5 hover:border-cyan-500/30 p-5 rounded-2xl transition-all group">
            <div>
              <p className="text-cyan-400 font-mono font-bold text-sm">{s.display_id}</p>
              <p className="text-white font-bold">{s.source?.name} → {s.destination?.name}</p>
              <p className="text-slate-500 text-xs mt-1">{s.vehicle_type}</p>
            </div>
            <ChevronRight className="text-slate-600 group-hover:text-cyan-400 transition" size={20} />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export default function Tracker() {
  const { shipmentId } = useParams();
  return shipmentId ? <TrackerMap shipmentId={shipmentId} /> : <ShipmentList />;
}

// ─────────────────────────────────────────────────────────────────────────────
// TrackerMap — Fix A (auto-reroute) + Fix B (route selection)
// ─────────────────────────────────────────────────────────────────────────────

function TrackerMap({ shipmentId }) {
  const navigate = useNavigate();

  // ── phase drives the entire page FSM ─────────────────────────────────────
  // 'loading'   → fetching shipment + scoring routes
  // 'selecting' → user picks a route (Fix B)
  // 'simulating' → running the simulation (Fix A active)
  const [phase, setPhase]           = useState('loading');
  const [shipment, setShipment]     = useState(null);
  const [corridor, setCorridor]     = useState('Mumbai-Pune');
  const [routeOptions, setRouteOpts] = useState([]);   // [{waypoints,distance_km,duration_min,avgRisk,label}]
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loadError, setLoadError]   = useState('');
  const [rerouteMsg, setRerouteMsg] = useState('');    // toast text
  const [markingDone, setMarkingDone] = useState(false);

  // Zustand
  const {
    isSimulating, playbackSpeed,
    waypoints, currentStep,
    riskScore, riskSeverity,
    rerouted, rerouting,
    setIsSimulating, setPlaybackSpeed,
    setWaypoints, setCurrentStep,
    setRisk, setRerouted, setRerouting, reset,
  } = useSimulationStore();

  // Map refs
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const markerRef     = useRef(null);
  const timerRef      = useRef(null);
  // Keep a ref to selectedIdx so map callbacks never close over stale state
  const selectedIdxRef = useRef(0);

  // ── 1. Load shipment + fetch + score alternatives ─────────────────────────
  useEffect(() => {
    reset();
    let cancelled = false;

    async function load() {
      try {
        const { data: s, error } = await supabase
          .from('shipments').select('*').eq('id', shipmentId).single();
        if (error) throw new Error(error.message);
        if (cancelled) return;
        setShipment(s);

        const cor = resolveCorridor(s.source?.name, s.destination?.name);
        setCorridor(cor);

        // ── Fix B: fetch alternatives + score in parallel ──────────────────
        const rawRoutes = await fetchAlternatives(s.source, s.destination);
        if (cancelled) return;

        const scored = await Promise.all(
          rawRoutes.map(async (r, i) => {
            const avgRisk = await scoreRoute(r.waypoints, cor);
            return { ...r, avgRisk: Math.round(avgRisk * 10) / 10, idx: i };
          }),
        );
        if (cancelled) return;

        // Label routes: safest gets ⭐ Recommended, shortest by time gets ⚡ Fastest
        const safeIdx = scored.reduce((b, r, i) => r.avgRisk < scored[b].avgRisk ? i : b, 0);
        const fastIdx = scored.reduce((b, r, i) => r.duration_min < scored[b].duration_min ? i : b, 0);

        const labelled = scored.map((r, i) => ({
          ...r,
          label:     i === safeIdx ? 'Safest Route' : i === fastIdx ? 'Fastest Route' : 'Alternative',
          recommended: i === safeIdx,
        }));

        setRouteOpts(labelled);
        setSelectedIdx(safeIdx);
        selectedIdxRef.current = safeIdx;
        setPhase('selecting');
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [shipmentId]);

  // ── 2. Init Mapbox once routeOptions are ready ────────────────────────────
  useEffect(() => {
    if (!routeOptions.length || !containerRef.current || mapRef.current) return;

    const start = routeOptions[0].waypoints[0];

    // OpenFreeMap (free, no key) + AWS terrain tiles (free, no key)
    const map = new maplibregl.Map({
      container: containerRef.current,
      style:  'https://tiles.openfreemap.org/styles/liberty',
      center: [start.lng, start.lat],
      zoom: 10, pitch: 45, bearing: 0,
    });
    mapRef.current = map;

    map.on('load', () => {
      // 3D terrain — AWS Mapzen elevation tiles, completely free, no key
      map.addSource('terrain', {
        type:     'raster-dem',
        encoding: 'terrarium',
        tiles:    ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom:  15,
      });
      map.setTerrain({ source: 'terrain', exaggeration: 1.5 });
      // Sky layer (supported in MapLibre ≥ 2.x)
      try {
        map.addLayer({ id: 'sky', type: 'sky', paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15,
        }});
      } catch { /* skip if not supported */ }

      // Draw each route alternative
      routeOptions.forEach((route, i) => {
        map.addSource(`route-opt-${i}`, {
          type: 'geojson',
          data: { type: 'Feature', geometry: {
            type: 'LineString',
            coordinates: route.waypoints.map(w => [w.lng, w.lat]),
          }},
        });
        map.addLayer({
          id: `route-opt-${i}`, type: 'line', source: `route-opt-${i}`,
          paint: {
            'line-color': ROUTE_COLORS[i] || '#ffffff',
            'line-width':   i === selectedIdxRef.current ? 5 : 3,
            'line-opacity': i === selectedIdxRef.current ? 1 : 0.35,
          },
        });
      });

      // Fit map to show all routes
      const allCoords = routeOptions.flatMap(r => r.waypoints.map(w => [w.lng, w.lat]));
      const bounds = allCoords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(allCoords[0], allCoords[0]),
      );
      map.fitBounds(bounds, { padding: 60, duration: 1200 });
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [routeOptions]);

  // ── 3. Highlight selected route when user changes selection ───────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || phase !== 'selecting') return;
    selectedIdxRef.current = selectedIdx;

    routeOptions.forEach((_, i) => {
      if (!map.getLayer(`route-opt-${i}`)) return;
      map.setPaintProperty(`route-opt-${i}`, 'line-width',   i === selectedIdx ? 5 : 3);
      map.setPaintProperty(`route-opt-${i}`, 'line-opacity', i === selectedIdx ? 1 : 0.35);
    });
  }, [selectedIdx, phase, routeOptions]);

  // ── 4. Transition to simulation mode ─────────────────────────────────────
  const startSimulation = useCallback(() => {
    const chosen = routeOptions[selectedIdx];
    const map = mapRef.current;
    if (!chosen || !map) return;

    // Restore saved step if shipment was paused mid-journey
    const savedStep = shipment?.current_step || 0;
    setWaypoints(chosen.waypoints);
    if (savedStep > 0 && savedStep < chosen.waypoints.length) {
      setCurrentStep(savedStep);
    }

    setPhase('simulating');

    // When map's style is ready, wire up simulation-mode layers
    const setup = () => {
      // Remove selection route lines, replace with single chosen route + done-overlay
      routeOptions.forEach((_, i) => {
        if (map.getLayer(`route-opt-${i}`))   map.removeLayer(`route-opt-${i}`);
        if (map.getSource(`route-opt-${i}`))  map.removeSource(`route-opt-${i}`);
      });

      // Full route (grey)
      map.addSource('full-route', { type: 'geojson', data: { type: 'Feature', geometry: {
        type: 'LineString', coordinates: chosen.waypoints.map(w => [w.lng, w.lat]),
      }}});
      map.addLayer({ id: 'full-route-line', type: 'line', source: 'full-route',
        paint: { 'line-color': 'rgba(255,255,255,0.2)', 'line-width': 3 },
      });

      // Completed portion (cyan)
      map.addSource('done-route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }}});
      map.addLayer({ id: 'done-route-line', type: 'line', source: 'done-route',
        paint: { 'line-color': '#06b6d4', 'line-width': 4, 'line-opacity': 0.9 },
      });

      // Rerouted path (red dashes — added later if reroute fires)
      map.addSource('reroute-path', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }}});
      map.addLayer({ id: 'reroute-line', type: 'line', source: 'reroute-path',
        paint: { 'line-color': '#ef4444', 'line-width': 3, 'line-dasharray': [2, 2] },
      });

      // Truck marker
      const el = Object.assign(document.createElement('div'), {
        style: 'font-size:28px;cursor:default;user-select:none;',
        textContent: '🚛',
      });
      const wp0 = chosen.waypoints[savedStep] || chosen.waypoints[0];
      markerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([wp0.lng, wp0.lat]).addTo(map);
    };

    // Layer operations must happen after 'load'
    if (map.isStyleLoaded()) setup();
    else map.once('load', setup);
  }, [routeOptions, selectedIdx, shipment]);

  // ── 5. Update map on every simulation step ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markerRef.current || !waypoints[currentStep] || phase !== 'simulating') return;

    const pt   = waypoints[currentStep];
    const next = waypoints[currentStep + 1];
    const bearing = next
      ? Math.atan2(next.lng - pt.lng, next.lat - pt.lat) * (180 / Math.PI)
      : 0;

    markerRef.current.setLngLat([pt.lng, pt.lat]);
    map.easeTo({ center: [pt.lng, pt.lat], bearing, pitch: 62, zoom: 13.5,
      duration: STEP_DELAY[playbackSpeed] * 0.85 });

    if (map.getSource('done-route')) {
      map.getSource('done-route').setData({ type: 'Feature', geometry: {
        type: 'LineString',
        coordinates: waypoints.slice(0, currentStep + 1).map(w => [w.lng, w.lat]),
      }});
    }
  }, [currentStep, phase]);

  // ── 6. Simulation timer ───────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!isSimulating || phase !== 'simulating') return;

    timerRef.current = setTimeout(() => {
      if (currentStep >= waypoints.length - 1) { setIsSimulating(false); return; }
      const next = currentStep + 1;
      setCurrentStep(next);
      if (next % 20 === 0) {
        supabase.from('shipments').update({ current_step: next }).eq('id', shipmentId);
      }
    }, STEP_DELAY[playbackSpeed]);

    return () => clearTimeout(timerRef.current);
  }, [isSimulating, currentStep, playbackSpeed, waypoints, phase]);

  // ── 7. Per-step risk prediction ───────────────────────────────────────────
  useEffect(() => {
    if (!waypoints[currentStep] || phase !== 'simulating') return;
    const { lat, lng } = waypoints[currentStep];
    axios.post(`${ML_URL}/predict`, { lat, lng, corridor }, { timeout: 4000 })
      .then(({ data }) => setRisk(data.risk_score, data.severity))
      .catch(() => {});
  }, [currentStep, phase]);

  // ── Fix A: auto-reroute when risk ≥ 80 ───────────────────────────────────
  useEffect(() => {
    if (riskScore < 80 || !isSimulating || rerouted || rerouting || phase !== 'simulating') return;
    if (!waypoints[currentStep] || !shipment) return;

    const triggerReroute = async () => {
      setIsSimulating(false);
      setRerouting(true);

      const { lat, lng } = waypoints[currentStep];
      let newWaypoints = null;

      // Try FastAPI /reroute first (works for the 5 supported corridors)
      try {
        const { data } = await axios.post(`${ML_URL}/reroute`, {
          current_lat:      lat,
          current_lng:      lng,
          destination_city: shipment.destination.name,
          corridor,
        }, { timeout: 10000 });
        newWaypoints = data.new_route; // [{ lat, lng }, ...]
      } catch { /* fall through to OSRM */ }

      // Fallback: OSRM with an offset mid-point to force a different path
      if (!newWaypoints) {
        try {
          const dst = shipment.destination;
          const offCoord = `${lng},${lat};${lng + 0.12},${lat + 0.08};${dst.lng},${dst.lat}`;
          const { data } = await axios.get(
            `${OSRM_BASE}/${offCoord}?overview=full&geometries=geojson`,
            { timeout: 10000 },
          );
          newWaypoints = data.routes[0].geometry.coordinates.map(([lo, la]) => ({ lat: la, lng: lo }));
        } catch { /* give up */ }
      }

      if (newWaypoints?.length) {
        // Splice new route in from current position
        const merged = [...waypoints.slice(0, currentStep), ...newWaypoints];
        setWaypoints(merged);
        setCurrentStep(currentStep); // stay at current step

        // Update reroute-path line on map (red dashes showing new path)
        const map = mapRef.current;
        if (map?.getSource('reroute-path')) {
          map.getSource('reroute-path').setData({ type: 'Feature', geometry: {
            type: 'LineString', coordinates: newWaypoints.map(w => [w.lng, w.lat]),
          }});
        }

        setRerouted(true);
        setRerouteMsg('⚠ High risk detected — route updated automatically');
        setTimeout(() => setRerouteMsg(''), 5000);
      }

      setRerouting(false);
      setIsSimulating(true);
    };

    triggerReroute();
  }, [riskScore, isSimulating, rerouted, rerouting, phase]);

  // ── Mark as Reached ───────────────────────────────────────────────────────
  const markReached = useCallback(async () => {
    setMarkingDone(true);
    setIsSimulating(false);
    await supabase.from('shipments')
      .update({ status: 'fulfilled', current_step: waypoints.length - 1 })
      .eq('id', shipmentId);
    navigate('/dashboard/shipments');
  }, [shipmentId, waypoints]);

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loadError) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
      <AlertTriangle size={32} className="text-red-400" />
      <p className="text-red-400">{loadError}</p>
      <button onClick={() => navigate(-1)} className="text-cyan-400 underline text-sm">Go back</button>
    </div>
  );

  const progress = waypoints.length > 1
    ? (currentStep / (waypoints.length - 1)) * 100 : 0;

  return (
    <div className="relative h-[calc(100vh-4rem)] -m-8 overflow-hidden">

      {/* ── Map (MapLibre GL — free, no key required) ── */}
      <div ref={containerRef} className="w-full h-full" />

      {/* ── Loading overlay ── */}
      {phase === 'loading' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#020617]/90 gap-4">
          <Loader2 size={36} className="text-cyan-400 animate-spin" />
          <p className="text-white font-black uppercase tracking-widest text-sm">
            Analysing Routes…
          </p>
          <p className="text-slate-500 text-xs">Scoring risk across all alternatives</p>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          Fix B — Route selection panel (phase === 'selecting')
          ──────────────────────────────────────────────────────────────────── */}
      {phase === 'selecting' && (
        <div className="absolute top-0 left-0 bottom-0 z-10 w-80 bg-black/75 backdrop-blur-md border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-white/10">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-white transition text-xs mb-3">
              <ArrowLeft size={14} /> Back
            </button>
            {shipment && (
              <>
                <p className="text-cyan-400 font-mono font-black text-sm">{shipment.display_id}</p>
                <p className="text-white font-bold text-base">{shipment.source?.name} → {shipment.destination?.name}</p>
                <p className="text-slate-500 text-xs mt-0.5">{shipment.vehicle_type}</p>
              </>
            )}
          </div>

          {/* Route options */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Choose Route</p>

            {routeOptions.map((r, i) => (
              <button
                key={i}
                onClick={() => setSelectedIdx(i)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedIdx === i
                    ? 'border-[color:var(--rc)] bg-[color:var(--rc)]/10'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                }`}
                style={{ '--rc': ROUTE_COLORS[i] }}
              >
                {/* Route label row */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ROUTE_COLORS[i] }} />
                    <span className="text-white font-black text-sm">{r.label}</span>
                  </div>
                  {r.recommended && (
                    <span className="flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <Star size={9} /> Recommended
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-xs text-slate-400 mt-2">
                  <span>{r.distance_km} km</span>
                  <span>{formatDuration(r.duration_min)}</span>
                </div>

                {/* Risk bar */}
                <RiskBar score={r.avgRisk} />
              </button>
            ))}
          </div>

          {/* Start button */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={startSimulation}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3.5 rounded-xl text-sm uppercase tracking-widest transition flex items-center justify-center gap-2"
            >
              <Play size={16} /> Start Simulation
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          Simulation overlays (phase === 'simulating')
          ──────────────────────────────────────────────────────────────────── */}
      {phase === 'simulating' && (
        <>
          {/* Back */}
          <button onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-10 p-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl text-white hover:text-cyan-400 transition">
            <ArrowLeft size={18} />
          </button>

          {/* Shipment chip */}
          {shipment && (
            <div className="absolute top-4 left-14 z-10 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
              <p className="text-cyan-400 font-mono font-black text-sm">{shipment.display_id}</p>
              <p className="text-white text-xs">{shipment.source?.name} → {shipment.destination?.name}</p>
            </div>
          )}

          {/* Risk gauge */}
          <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 text-center">Risk Level</p>
            <RiskGauge score={riskScore} severity={riskSeverity} />
          </div>

          {/* Rerouting spinner */}
          {rerouting && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20
              bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl px-8 py-5 flex items-center gap-4">
              <RefreshCw size={22} className="text-cyan-400 animate-spin" />
              <p className="text-white font-black uppercase tracking-widest text-sm">Rerouting…</p>
            </div>
          )}

          {/* Reroute toast */}
          {rerouteMsg && (
            <div className="absolute top-20 right-4 z-20 bg-red-500/90 backdrop-blur-sm border border-red-400/50 rounded-xl px-4 py-3 max-w-xs animate-in fade-in slide-in-from-top-2">
              <p className="text-white font-black text-xs">{rerouteMsg}</p>
            </div>
          )}

          {/* Rerouted badge */}
          {rerouted && !rerouteMsg && (
            <div className="absolute top-20 right-4 z-10 bg-black/60 backdrop-blur-sm border border-red-500/30 rounded-xl px-3 py-1.5">
              <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">Route Updated</p>
            </div>
          )}

          {/* Bottom control bar */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/70 backdrop-blur-md border-t border-white/10 px-6 py-4">
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }} />
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Play/Pause */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  disabled={currentStep >= waypoints.length - 1}
                  className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-black px-5 py-2.5 rounded-xl transition text-sm uppercase tracking-widest"
                >
                  {isSimulating ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Play</>}
                </button>

                {/* Speed */}
                <div className="flex items-center gap-1">
                  {[1, 2, 5, 10].map(s => (
                    <button key={s} onClick={() => setPlaybackSpeed(s)}
                      className={`px-3 py-2 rounded-lg text-xs font-black uppercase transition ${
                        playbackSpeed === s
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}>
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-slate-500 text-xs font-mono hidden sm:block">
                Step {currentStep + 1} / {waypoints.length}
              </p>

              {/* Mark as reached */}
              <button onClick={markReached} disabled={markingDone}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black px-5 py-2.5 rounded-xl transition text-sm uppercase tracking-widest">
                {markingDone
                  ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                  : <><Flag size={16} /> Mark as Reached</>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
