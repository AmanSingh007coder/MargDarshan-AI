import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Play, Pause, ArrowLeft,
  Loader2, AlertTriangle, SkipForward, Zap,
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import useSimulationStore from '../store/useSimulationStore';

const ML_URL    = import.meta.env.VITE_ML_URL || 'http://localhost:8888';
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const STEP_DELAY = { 1: 900, 2: 450, 5: 180, 10: 90 };

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
  if (s >= 80) return '#ef4444'; if (s >= 60) return '#f97316';
  if (s >= 40) return '#eab308'; return '#10b981';
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
          style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease' }} />
        <text x={48} y={52} textAnchor="middle" fill="white" fontSize={18} fontWeight={900}>{score.toFixed(0)}</text>
      </svg>
      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${SEV_STYLE[severity] || SEV_STYLE.LOW}`}>{severity}</span>
    </div>
  );
}

// ── Shipment picker (no shipmentId) ──────────────────────────────────────────

function SimulatePicker() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    supabase.from('shipments')
      .select('id,display_id,vehicle_type,source,destination,type,status')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setShipments(data || []); setLoading(false); });
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-500/10 rounded-xl"><Zap size={20} className="text-cyan-400" /></div>
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Simulate</h1>
          <p className="text-slate-500 text-xs mt-0.5">Pick a shipment to run a simulation</p>
        </div>
      </div>

      {loading && <p className="text-slate-500 text-sm">Loading…</p>}
      {!loading && !shipments.length && (
        <p className="text-slate-600 text-sm text-center py-8">No shipments found. <Link to="/dashboard/new-shipment" className="text-cyan-400 underline">Create one.</Link></p>
      )}
      <div className="space-y-2">
        {shipments.map(s => (
          <Link key={s.id} to={`/simulate/${s.id}`}
            className="flex items-center justify-between bg-[#050810] border border-white/5 hover:border-cyan-500/30 p-5 rounded-2xl transition-all group">
            <div>
              <p className="text-cyan-400 font-mono font-black text-sm">{s.display_id}</p>
              <p className="text-white font-bold">{s.source?.name} → {s.destination?.name}</p>
              <p className="text-slate-500 text-xs mt-0.5">{s.vehicle_type} · {s.type}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                s.status === 'in_transit' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                s.status === 'fulfilled'  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                'text-slate-400 border-white/10 bg-white/5'
              }`}>{s.status?.replace('_',' ')}</span>
              <Play size={16} className="text-slate-600 group-hover:text-cyan-400 transition" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Simulate Map ──────────────────────────────────────────────────────────────

function SimulateMap({ shipmentId }) {
  const navigate = useNavigate();

  const [shipment, setShipment]   = useState(null);
  const [corridor, setCorridor]   = useState('Mumbai-Pune');
  const [loadError, setLoadError] = useState('');
  const [ready, setReady]         = useState(false);

  const {
    isSimulating, playbackSpeed,
    waypoints, currentStep,
    riskScore, riskSeverity,
    setIsSimulating, setPlaybackSpeed,
    setWaypoints, setCurrentStep,
    setRisk, reset,
  } = useSimulationStore();

  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);
  const timerRef     = useRef(null);

  // Load shipment + route
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
        setCorridor(resolveCorridor(s.source?.name, s.destination?.name));

        // Fetch route — water uses ML backend, land uses OSRM
        let wps;
        if (s.type === 'water') {
          const srcLat  = s.source?.lat;
          const srcLng  = s.source?.lng;
          const dstLat  = s.destination?.lat;
          const dstLng  = s.destination?.lng;
          if (!srcLat || !srcLng || !dstLat || !dstLng)
            throw new Error(`Missing coordinates — src:(${srcLat},${srcLng}) dst:(${dstLat},${dstLng})`);

          const { data } = await axios.post(`${ML_URL}/water/route`, {
            origin_lat:      srcLat,
            origin_lng:      srcLng,
            destination_lat: dstLat,
            destination_lng: dstLng,
            vessel_type:     s.vehicle_type || 'Bulk Carrier',
            quantity_tons:   1,
          }, { timeout: 10000 });
          wps = data.waypoints.map(w => ({ lat: w.lat, lng: w.lng }));
        } else {
          const coord = `${s.source.lng},${s.source.lat};${s.destination.lng},${s.destination.lat}`;
          const { data } = await axios.get(
            `${OSRM_BASE}/${coord}?overview=full&geometries=geojson`, { timeout: 10000 }
          );
          wps = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
        }
        if (cancelled) return;
        setWaypoints(wps);
        setReady(true);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [shipmentId]);

  // Init map when route is ready
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current || !waypoints.length) return;
    const start = waypoints[0];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [start.lng, start.lat],
      zoom: 10, pitch: 45,
    });
    mapRef.current = map;

    map.on('load', () => {
      try {
        map.addSource('terrain', {
          type: 'raster-dem', encoding: 'terrarium',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          tileSize: 256, maxzoom: 15,
        });
        map.setTerrain({ source: 'terrain', exaggeration: 1.5 });
        map.addLayer({ id: 'sky', type: 'sky', paint: {
          'sky-type': 'atmosphere', 'sky-atmosphere-sun': [0.0, 0.0], 'sky-atmosphere-sun-intensity': 15,
        }});
      } catch { /* MapLibre version may not support sky */ }

      // Full route (grey)
      map.addSource('full-route', { type: 'geojson', data: { type: 'Feature', geometry: {
        type: 'LineString', coordinates: waypoints.map(w => [w.lng, w.lat]),
      }}});
      map.addLayer({ id: 'full-route-line', type: 'line', source: 'full-route',
        paint: { 'line-color': 'rgba(255,255,255,0.2)', 'line-width': 3 } });

      // Done portion (cyan)
      map.addSource('done-route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }}});
      map.addLayer({ id: 'done-route-line', type: 'line', source: 'done-route',
        paint: { 'line-color': '#06b6d4', 'line-width': 4, 'line-opacity': 0.9 } });

      // Truck marker
      const el = Object.assign(document.createElement('div'), {
        style: 'font-size:28px;cursor:default;user-select:none;',
        textContent: shipment?.type === 'water' ? '🚢' : '🚛',
      });
      markerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([start.lng, start.lat]).addTo(map);

      // Fit to route
      const bounds = waypoints.reduce(
        (b, w) => b.extend([w.lng, w.lat]),
        new maplibregl.LngLatBounds([start.lng, start.lat], [start.lng, start.lat])
      );
      map.fitBounds(bounds, { padding: 80, duration: 1200 });
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [ready]);

  // Update marker + done-route on each step
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markerRef.current || !waypoints[currentStep]) return;
    const pt = waypoints[currentStep];
    const next = waypoints[currentStep + 1];
    const bearing = next
      ? Math.atan2(next.lng - pt.lng, next.lat - pt.lat) * (180 / Math.PI) : 0;

    markerRef.current.setLngLat([pt.lng, pt.lat]);
    map.easeTo({ center: [pt.lng, pt.lat], bearing, pitch: 60, zoom: 13.5,
      duration: STEP_DELAY[playbackSpeed] * 0.85 });

    if (map.getSource('done-route')) {
      map.getSource('done-route').setData({ type: 'Feature', geometry: {
        type: 'LineString', coordinates: waypoints.slice(0, currentStep + 1).map(w => [w.lng, w.lat]),
      }});
    }
  }, [currentStep]);

  // Simulation timer
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!isSimulating || !ready) return;
    timerRef.current = setTimeout(() => {
      if (currentStep >= waypoints.length - 1) { setIsSimulating(false); return; }
      setCurrentStep(currentStep + 1);
    }, STEP_DELAY[playbackSpeed]);
    return () => clearTimeout(timerRef.current);
  }, [isSimulating, currentStep, playbackSpeed, waypoints, ready]);

  // Per-step risk prediction
  useEffect(() => {
    if (!waypoints[currentStep] || !ready) return;
    const { lat, lng } = waypoints[currentStep];
    axios.post(`${ML_URL}/predict`, { lat, lng, corridor }, { timeout: 4000 })
      .then(({ data }) => setRisk(data.risk_score, data.severity))
      .catch(() => {});
  }, [currentStep, ready]);

  const skipToEnd = () => {
    setIsSimulating(false);
    setCurrentStep(waypoints.length - 1);
  };

  const scrubTo = (e) => {
    const pct = parseFloat(e.target.value) / 100;
    setIsSimulating(false);
    setCurrentStep(Math.round(pct * (waypoints.length - 1)));
  };

  const progress = waypoints.length > 1 ? (currentStep / (waypoints.length - 1)) * 100 : 0;

  if (loadError) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
      <AlertTriangle size={32} className="text-red-400" />
      <p className="text-red-400">{loadError}</p>
      <button onClick={() => navigate('/simulate')} className="text-cyan-400 underline text-sm">Go back</button>
    </div>
  );

  return (
    <div className="relative h-[calc(100vh-4rem)] -m-8 overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#020617]/90 gap-4">
          <Loader2 size={36} className="text-cyan-400 animate-spin" />
          <p className="text-white font-black uppercase tracking-widest text-sm">Loading Route…</p>
        </div>
      )}

      {ready && (
        <>
          {/* Back */}
          <button onClick={() => navigate('/simulate')}
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

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/70 backdrop-blur-md border-t border-white/10 px-6 py-4 space-y-3">
            {/* Scrubber */}
            <div className="flex items-center gap-3">
              <span className="text-slate-500 text-xs font-mono w-16">
                {currentStep + 1}/{waypoints.length}
              </span>
              <input
                type="range" min={0} max={100}
                value={progress.toFixed(1)}
                onChange={scrubTo}
                className="flex-1 accent-cyan-400 cursor-pointer"
              />
              <span className="text-slate-500 text-xs font-mono w-10 text-right">{progress.toFixed(0)}%</span>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Play/Pause */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  disabled={currentStep >= waypoints.length - 1}
                  className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-black px-5 py-2.5 rounded-xl transition text-sm uppercase tracking-widest">
                  {isSimulating ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Play</>}
                </button>

                {/* Speed */}
                <div className="flex items-center gap-1">
                  {[1, 2, 5, 10].map(s => (
                    <button key={s} onClick={() => setPlaybackSpeed(s)}
                      className={`px-3 py-2 rounded-lg text-xs font-black uppercase transition ${
                        playbackSpeed === s ? 'bg-white text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}>{s}×</button>
                  ))}
                </div>

                {/* Skip to end */}
                <button onClick={skipToEnd} title="Skip to end"
                  className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white px-3 py-2.5 rounded-xl transition text-xs font-black">
                  <SkipForward size={15} /> Skip
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Tracker() {
  const { shipmentId } = useParams();
  return shipmentId ? <SimulateMap shipmentId={shipmentId} /> : <SimulatePicker />;
}
