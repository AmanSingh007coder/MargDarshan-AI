import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Truck, Ship, MapPin, ArrowRight, ArrowLeft, Loader2, Navigation, Fuel, Clock } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { generateDisplayId } from '../utils/idGenerator';

const CITY_NORMALIZE = {
  'Bangalore': 'Bengaluru', 'Mangalore': 'Mangaluru',
  'Calicut': 'Kozhikode',  'Cochin': 'Kochi', 'Panaji': 'Goa',
};

const VEHICLE_TYPES = {
  land: [
    'Heavy Truck (>12T)', 'Medium Truck (3.5–12T)', 'Light Commercial',
    'Refrigerated Vehicle', 'Tanker', 'Container Truck',
  ],
  water: [
    'Container Ship', 'Bulk Carrier', 'Tanker (Crude)',
    'LNG Carrier', 'RORO Vessel', 'General Cargo', 'Tug & Barge',
  ],
};

function GeoSearchInput({ label, value, onSelect }) {
  const [query, setQuery]     = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const debounceRef           = useRef(null);
  const wrapperRef            = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = (q) => {
    clearTimeout(debounceRef.current);
    if (q.length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=in&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const features = (data || []).map(f => ({
          name: f.address?.city || f.address?.town || f.address?.state_district || f.display_name.split(',')[0].trim(),
          full: f.display_name,
          lat:  parseFloat(f.lat),
          lng:  parseFloat(f.lon),
        }));
        setResults(features);
        setOpen(features.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  };

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
        <MapPin size={11} /> {label}
      </label>
      <div className="relative">
        <input
          type="text" value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Type a city…"
          className="w-full bg-slate-800 border border-slate-600 p-3 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition"
        />
        {loading && <Loader2 className="absolute right-3 top-2.5 text-slate-400 animate-spin" size={16} />}
      </div>
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg overflow-hidden shadow-2xl">
          {results.map((r, i) => (
            <li key={i} onMouseDown={() => {
              const normalized = { ...r, name: CITY_NORMALIZE[r.name] || r.name };
              setQuery(normalized.name); onSelect(normalized); setOpen(false);
            }} className="px-4 py-2 cursor-pointer hover:bg-cyan-500/20 transition-colors border-b border-slate-700 last:border-0">
              <p className="text-white text-sm font-bold">{r.name}</p>
              <p className="text-slate-400 text-xs">{r.full}</p>
            </li>
          ))}
        </ul>
      )}
      {value && (
        <p className="text-xs text-cyan-400 font-mono">[OK] {value.lat.toFixed(4)}, {value.lng.toFixed(4)}</p>
      )}
    </div>
  );
}

function WaterPortSelect({ label, value, ports, onSelect }) {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
        <MapPin size={11} /> {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-slate-800 border border-slate-600 p-3 rounded-lg text-white text-left focus:border-cyan-500 outline-none transition hover:border-slate-500 flex items-center justify-between"
      >
        <span>{value?.name || 'Select port...'}</span>
        <Navigation size={14} className="text-slate-400" />
      </button>
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
          {ports.map((p, i) => (
            <li
              key={i}
              onMouseDown={() => {
                onSelect(p);
                setOpen(false);
              }}
              className="px-4 py-2 cursor-pointer hover:bg-cyan-500/20 transition-colors border-b border-slate-700 last:border-0"
            >
              <p className="text-white text-sm font-bold">{p.name}</p>
              <p className="text-slate-400 text-xs">{p.city} · {p.region}</p>
            </li>
          ))}
        </ul>
      )}
      {value && (
        <p className="text-xs text-cyan-400 font-mono">[OK] {value.lat.toFixed(4)}, {value.lng.toFixed(4)}</p>
      )}
    </div>
  );
}

export default function NewShipment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState(null);
  const [vehicleType, setVehicleType] = useState('');
  const [source, setSource] = useState(null);
  const [destination, setDest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ports, setPorts] = useState([]);
  const [estimates, setEstimates] = useState(null);
  const [estimating, setEstimating] = useState(false);

  // Load ports on mount
  useEffect(() => {
    if (type === 'water') {
      axios.get('http://localhost:8888/water/ports')
        .then(res => setPorts(res.data.ports))
        .catch(err => console.error('Failed to load ports:', err));
    }
  }, [type]);

  // Calculate estimates when source/dest change
  useEffect(() => {
    if (type === 'water' && source && destination) {
      setEstimating(true);
      axios.post('http://localhost:8888/water/smart-route', {
        origin_lat: source.lat,
        origin_lng: source.lng,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        vessel_type: vehicleType,
        quantity_tons: 1,
      }, { timeout: 20000 })
        .then(res => setEstimates(res.data))
        .catch(() => {
          // fallback to basic route if smart-route fails
          axios.post('http://localhost:8888/water/route', {
            origin_lat: source.lat, origin_lng: source.lng,
            destination_lat: destination.lat, destination_lng: destination.lng,
            vessel_type: vehicleType, quantity_tons: 1,
          }).then(res => setEstimates(res.data)).catch(() => {});
        })
        .finally(() => setEstimating(false));
    }
  }, [type, source, destination, vehicleType]);

  const selectType = (t) => {
    setType(t);
    setVehicleType(VEHICLE_TYPES[t][0]);
    setSource(null);
    setDest(null);
    setEstimates(null);
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!source) return setError('Please select a source location.');
    if (!destination) return setError('Please select a destination location.');
    if (source.name === destination.name) return setError('Source and destination must be different.');

    setLoading(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Not authenticated. Please log in.');

      const { data, error: dbErr } = await supabase
        .from('shipments')
        .insert({
          display_id: generateDisplayId(),
          user_id: user.id,
          type,
          vehicle_type: vehicleType,
          source: { name: source.name, lat: source.lat, lng: source.lng },
          destination: { name: destination.name, lat: destination.lat, lng: destination.lng },
          status: 'in_transit',
          current_step: 0,
          ...(estimates && type === 'water' ? {
            route_meta: {
              distance_km:        estimates.distance_km,
              eta_hours:          estimates.eta_hours,
              fuel_required_tons: estimates.fuel_required_tons,
            }
          } : {}),
        })
        .select()
        .single();

      if (dbErr) throw dbErr;
      navigate('/dashboard/map');
    } catch (err) {
      setError(err.message || 'Failed to create shipment.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Initiate Protocol</h1>
          <p className="text-slate-400 text-sm mt-1">Select the shipment mode to continue.</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <button onClick={() => selectType('land')}
            className="group bg-slate-900 border border-slate-700 hover:border-cyan-500 rounded-2xl p-8 flex flex-col items-center gap-4 transition-all hover:bg-cyan-500/5">
            <div className="p-4 rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-all">
              <Truck size={36} className="text-cyan-400" />
            </div>
            <span className="text-white font-black uppercase tracking-widest text-sm">Land</span>
            <span className="text-slate-400 text-xs text-center">Road freight across corridors</span>
          </button>
          <button onClick={() => selectType('water')}
            className="group bg-slate-900 border border-slate-700 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center gap-4 transition-all hover:bg-blue-500/5">
            <div className="p-4 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-all">
              <Ship size={36} className="text-blue-400" />
            </div>
            <span className="text-white font-black uppercase tracking-widest text-sm">Water</span>
            <span className="text-slate-400 text-xs text-center">Maritime shipping routes</span>
          </button>
        </div>
      </div>
    );
  }

  const isWater = type === 'water';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <button onClick={() => setStep(1)} className="p-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Shipment Details</h1>
          <p className="text-slate-400 text-xs mt-1">
            {isWater ? 'Maritime · Select ports and vessel' : 'Land · Select cities and vehicle'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/50 border border-slate-700 rounded-xl p-6">
        {/* Vehicle/Vessel Type */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
            {isWater ? 'Vessel Type' : 'Vehicle Type'}
          </label>
          <select
            value={vehicleType}
            onChange={e => setVehicleType(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 p-3 rounded-lg text-white text-sm focus:border-cyan-500 outline-none transition"
          >
            {VEHICLE_TYPES[type].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Source & Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isWater ? (
            <>
              <WaterPortSelect label="Origin Port" value={source} ports={ports} onSelect={setSource} />
              <WaterPortSelect label="Destination Port" value={destination} ports={ports} onSelect={setDest} />
            </>
          ) : (
            <>
              <GeoSearchInput label="Source" value={source} onSelect={setSource} />
              <GeoSearchInput label="Destination" value={destination} onSelect={setDest} />
            </>
          )}
        </div>

        {/* Water Estimates */}
        {isWater && source && destination && estimating && (
          <div className="flex items-center gap-2 text-slate-400 text-xs p-3">
            <Loader2 size={14} className="animate-spin" /> Calculating optimal route...
          </div>
        )}
        {isWater && source && destination && estimates && !estimating && (
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 space-y-3">
            <p className="text-xs font-black text-slate-400 uppercase">Route Estimates</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Navigation size={14} className="text-blue-400" />
                <div>
                  <p className="text-slate-400 text-xs">Distance</p>
                  <p className="text-white font-bold">{estimates.distance_km} km</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-green-400" />
                <div>
                  <p className="text-slate-400 text-xs">ETA</p>
                  <p className="text-white font-bold">{estimates.eta_hours}h</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Fuel size={14} className="text-amber-400" />
                <div>
                  <p className="text-slate-400 text-xs">Fuel</p>
                  <p className="text-white font-bold">{estimates.fuel_required_tons}t</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{error}</div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-600 text-white py-3 rounded-lg font-black text-sm uppercase tracking-widest hover:bg-cyan-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Creating...
            </>
          ) : (
            <>
              Create & Go Live <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
