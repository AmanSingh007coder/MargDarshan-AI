import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Play, Pause, ArrowLeft,
  Loader2, AlertTriangle, SkipForward, Zap
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import useSimulationStore from '../store/useSimulationStore';

const ML_URL    = import.meta.env.VITE_ML_URL || 'http://localhost:8888';
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const STEP_DELAY = 180; // Fixed speed optimized for smooth visual tracking

const CORRIDOR_PAIRS = {
  'Mumbai-Pune': [['Mumbai','Pune'],['Pune','Mumbai']],
  'Pune-Nashik': [['Pune','Nashik'],['Nashik','Pune']],
  'Mumbai-Goa': [['Mumbai','Goa'],['Goa','Mumbai']],
  'Bengaluru-Mangaluru': [['Bengaluru','Mangaluru'],['Mangaluru','Bengaluru']],
  'Kochi-Kozhikode': [['Kochi','Kozhikode'],['Kozhikode','Kochi']],
};

function resolveCorridor(src, dst) {
  for (const [name, pairs] of Object.entries(CORRIDOR_PAIRS))
    if (pairs.some(([o, d]) => o === src && d === dst)) return name;
  return 'Mumbai-Pune';
}

// ── Compact Shipment Picker ──────────────────────────────────────────

function SimulatePicker() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    supabase.from('shipments')
      .select('id,display_id,vehicle_type,source,destination,type,status')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setShipments(data || []); setLoading(false); });
  }, []);

  const filtered = shipments.filter(s =>
    !search ||
    s.display_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.source?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.destination?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <Zap size={22} className="text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Tactical Simulations</h1>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Select manifest to initialize projection</p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search by ID, port..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none w-64"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-44 bg-white/[0.02] border border-white/5 rounded-[2rem] animate-pulse" />)
        ) : (
          filtered.map(s => (
            <Link key={s.id} to={`/simulate/${s.id}`}
              className="group relative bg-[#050810] border border-white/5 hover:border-cyan-500/40 p-6 rounded-[2rem] transition-all duration-500 hover:-translate-y-2 overflow-hidden shadow-2xl">
              
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.05)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,1)]" />
                    <p className="text-cyan-400 font-mono font-black text-[10px] tracking-widest">{s.display_id}</p>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-lg border tracking-tighter ${
                    s.status === 'in_transit' ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5' : 'text-slate-500 border-white/10 bg-white/5'
                  }`}>{s.status?.replace('_',' ')}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="relative pl-4 border-l border-white/10 group-hover:border-cyan-500/30 transition-colors">
                    <p className="text-white font-black text-sm leading-tight uppercase italic tracking-tight truncate">{s.source?.name}</p>
                    <div className="h-3 w-[1px] bg-gradient-to-b from-cyan-500/50 to-transparent my-1" />
                    <p className="text-white font-black text-sm leading-tight uppercase italic tracking-tight truncate">{s.destination?.name}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest leading-none mb-1">Asset Type</p>
                    <p className="text-slate-300 text-[10px] font-bold truncate max-w-[150px]">{s.vehicle_type}</p>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-slate-500 group-hover:bg-cyan-500 group-hover:text-black group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300">
                    <Play size={14} fill="currentColor" />
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

// ── Tactical Map View ──────────────────────────────────────────────────────────────

function SimulateMap({ shipmentId }) {
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [corridor, setCorridor] = useState('Mumbai-Pune');
  const [loadError, setLoadError] = useState('');
  const [ready, setReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const {
    isSimulating,
    waypoints, currentStep,
    setIsSimulating,
    setWaypoints, setCurrentStep,
    setRisk, reset,
  } = useSimulationStore();

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    reset();
    setReady(false);
    setLoadError('');
    let cancelled = false;

    async function load() {
      try {
        const { data: s, error } = await supabase.from('shipments').select('*').eq('id', shipmentId).single();
        if (error) throw new Error(error.message);
        if (cancelled) return;
        setShipment(s);
        setCorridor(resolveCorridor(s.source?.name, s.destination?.name));

        let wps;
        if (s.type === 'water') {
          const srcLat = s.source?.lat, srcLng = s.source?.lng;
          const dstLat = s.destination?.lat, dstLng = s.destination?.lng;
          if (!srcLat || !srcLng || !dstLat || !dstLng)
            throw new Error(`Missing coordinates — src:(${srcLat},${srcLng}) dst:(${dstLat},${dstLng})`);

          try {
            const { data } = await axios.post(`${ML_URL}/water/route`, {
              origin_lat: srcLat, origin_lng: srcLng,
              destination_lat: dstLat, destination_lng: dstLng,
              vessel_type: s.vehicle_type || 'Bulk Carrier', quantity_tons: 1,
            }, { timeout: 12000 });
            wps = data.waypoints.map(w => ({ lat: w.lat, lng: w.lng }));
          } catch {
            // Backend unavailable — use coastal bridge fallback
            const isWest = srcLng < 78;
            const bridge = isWest
              ? [[17.0,73.1],[15.5,73.7],[13.5,74.6],[11.5,75.4],[9.8,75.9],[8.5,76.5],[7.8,77.0],[7.0,77.5],[6.0,78.5],[5.7,80.0],[5.9,81.5],[7.0,82.5],[9.5,83.5],[12.5,84.5],[15.5,85.1]]
              : [[15.5,85.1],[12.5,84.5],[9.5,83.5],[7.0,82.5],[5.9,81.5],[5.7,80.0],[6.0,78.5],[7.0,77.5],[7.8,77.0],[8.5,76.5],[9.8,75.9],[11.5,75.4],[13.5,74.6],[15.5,73.7],[17.0,73.1]];
            const allPts = [[srcLat,srcLng], ...bridge, [dstLat,dstLng]];
            const pts = [];
            for (let i = 0; i < allPts.length - 1; i++) {
              const [la1,ln1] = allPts[i], [la2,ln2] = allPts[i+1];
              for (let j = 0; j < 20; j++) {
                const t = j / 20, st = t * t * (3 - 2 * t);
                pts.push({ lat: la1 + (la2 - la1) * st, lng: ln1 + (ln2 - ln1) * st });
              }
            }
            pts.push({ lat: dstLat, lng: dstLng });
            wps = pts;
          }
        } else {
          try {
            const coord = `${s.source.lng},${s.source.lat};${s.destination.lng},${s.destination.lat}`;
            const { data } = await axios.get(
              `${OSRM_BASE}/${coord}?overview=full&geometries=geojson`, { timeout: 12000 }
            );
            wps = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
          } catch {
            // OSRM unavailable — straight line fallback
            wps = [
              { lat: s.source.lat, lng: s.source.lng },
              { lat: s.destination.lat, lng: s.destination.lng },
            ];
          }
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
  }, [shipmentId, reset, setWaypoints, retryCount]);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current || !waypoints.length) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [waypoints[0].lng, waypoints[0].lat],
      zoom: 10, pitch: 45,
    });
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('full-route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: waypoints.map(w => [w.lng, w.lat]) }}});
      map.addLayer({ id: 'full-route-line', type: 'line', source: 'full-route', paint: { 'line-color': 'rgba(255,255,255,0.15)', 'line-width': 3 } });
      map.addSource('done-route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }}});
      map.addLayer({ id: 'done-route-line', type: 'line', source: 'done-route', paint: { 'line-color': '#06b6d4', 'line-width': 4 } });

      const el = document.createElement('div');
      el.style.fontSize = '32px';
      el.textContent = shipment?.type === 'water' ? '🚢' : '🚛';
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([waypoints[0].lng, waypoints[0].lat]).addTo(map);
      
      const bounds = waypoints.reduce((b, w) => b.extend([w.lng, w.lat]), new maplibregl.LngLatBounds([waypoints[0].lng, waypoints[0].lat], [waypoints[0].lng, waypoints[0].lat]));
      map.fitBounds(bounds, { padding: 80, duration: 1200 });
    });
    return () => map.remove();
  }, [ready, waypoints, shipment]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markerRef.current || !waypoints[currentStep]) return;
    const pt = waypoints[currentStep];
    markerRef.current.setLngLat([pt.lng, pt.lat]);
    map.easeTo({ center: [pt.lng, pt.lat], duration: STEP_DELAY * 0.85 });
    if (map.getSource('done-route')) {
      map.getSource('done-route').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: waypoints.slice(0, currentStep + 1).map(w => [w.lng, w.lat]) }});
    }
  }, [currentStep, waypoints]);

  useEffect(() => {
    if (!isSimulating || !ready) return;
    timerRef.current = setTimeout(() => {
      if (currentStep >= waypoints.length - 1) { setIsSimulating(false); return; }
      setCurrentStep(currentStep + 1);
    }, STEP_DELAY);
    return () => clearTimeout(timerRef.current);
  }, [isSimulating, currentStep, waypoints, ready, setIsSimulating, setCurrentStep]);

  useEffect(() => {
    if (!waypoints[currentStep] || !ready) return;
    const { lat, lng } = waypoints[currentStep];
    axios.post(`${ML_URL}/predict`, { lat, lng, corridor }).then(({ data }) => setRisk(data.risk_score, data.severity)).catch(() => {});
  }, [currentStep, ready, corridor, setRisk]);

  const handleScrub = (e) => {
    const value = parseInt(e.target.value);
    setIsSimulating(false); // Stop playback while scrubbing
    setCurrentStep(value);
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] -m-8 overflow-hidden bg-black">
      <div ref={containerRef} className="w-full h-full" />
      
      {!ready && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#020617] gap-4">
          {loadError ? (
            <>
              <AlertTriangle size={32} className="text-red-400" />
              <p className="text-red-400 font-black uppercase tracking-widest text-xs text-center max-w-xs">{loadError}</p>
              <button
                onClick={() => setRetryCount(c => c + 1)}
                className="mt-2 px-6 py-2 bg-cyan-500 text-black text-xs font-black uppercase rounded-xl hover:bg-cyan-400 transition"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <Loader2 size={36} className="text-cyan-400 animate-spin" />
              <p className="text-white font-black uppercase tracking-widest text-xs">Calibrating Route...</p>
            </>
          )}
        </div>
      )}

      {ready && (
        <>
          <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
            <button onClick={() => navigate('/simulate')} className="p-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl text-white hover:text-cyan-400 transition shadow-2xl">
              <ArrowLeft size={20} />
            </button>
            {shipment && (
              <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 shadow-2xl">
                <p className="text-cyan-400 font-mono font-black text-[10px] tracking-widest leading-none mb-1">{shipment.display_id}</p>
                <p className="text-white text-xs font-bold leading-none">{shipment.source?.name} → {shipment.destination?.name}</p>
              </div>
            )}
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-4xl bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            {/* Scrubber / Progress Bar */}
            <div className="flex items-center gap-4 group">
               <span className="text-[10px] font-mono text-slate-500 w-12">
                 {Math.round((currentStep / (waypoints.length - 1)) * 100)}%
               </span>
               <input
                 type="range"
                 min="0"
                 max={waypoints.length - 1}
                 value={currentStep}
                 onChange={handleScrub}
                 className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
               />
               <span className="text-[10px] font-mono text-slate-500 w-12 text-right">
                 {currentStep}/{waypoints.length - 1}
               </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSimulating(!isSimulating)} 
                  disabled={currentStep >= waypoints.length - 1 && !isSimulating}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black px-10 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSimulating ? <><Pause size={16} /> Pause Simulation</> : <><Play size={16} /> Play Simulation</>}
                </button>
                
                {currentStep >= waypoints.length - 1 && (
                  <button 
                    onClick={() => setCurrentStep(0)} 
                    className="text-cyan-500 text-[10px] font-black uppercase tracking-widest hover:underline"
                  >
                    Restart
                  </button>
                )}
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden sm:flex flex-col items-end">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Simulation Active</p>
                   <p className="text-white font-mono text-[11px] mt-1">{isSimulating ? 'TRANSMITTING' : 'IDLE'}</p>
                </div>
                <button 
                  onClick={() => setCurrentStep(waypoints.length - 1)} 
                  className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition tracking-widest flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/5"
                >
                  <SkipForward size={14} /> Final Dest
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