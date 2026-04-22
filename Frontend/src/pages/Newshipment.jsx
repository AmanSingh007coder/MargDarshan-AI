import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Truck, Ship, MapPin, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
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
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
        <MapPin size={11} /> {label}
      </label>
      <div className="relative">
        <input
          type="text" value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Type a city or port name…"
          className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition pr-10"
        />
        {loading && <Loader2 className="absolute right-3 top-4 text-slate-500 animate-spin" size={16} />}
      </div>
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-[#0d1424] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          {results.map((r, i) => (
            <li key={i} onMouseDown={() => {
              const normalized = { ...r, name: CITY_NORMALIZE[r.name] || r.name };
              setQuery(normalized.name); onSelect(normalized); setOpen(false);
            }} className="px-4 py-3 cursor-pointer hover:bg-cyan-500/10 transition-colors">
              <p className="text-white text-sm font-bold">{r.name}</p>
              <p className="text-slate-500 text-xs truncate">{r.full}</p>
            </li>
          ))}
        </ul>
      )}
      {value && (
        <p className="text-xs text-cyan-500 font-mono">✓ {value.lat.toFixed(4)}, {value.lng.toFixed(4)}</p>
      )}
    </div>
  );
}

export default function NewShipment() {
  const navigate = useNavigate();
  const [step, setStep]               = useState(1);
  const [type, setType]               = useState(null);
  const [vehicleType, setVehicleType] = useState('');
  const [source, setSource]           = useState(null);
  const [destination, setDest]        = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const selectType = (t) => {
    setType(t);
    setVehicleType(VEHICLE_TYPES[t][0]);
    setSource(null);
    setDest(null);
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!source)      return setError('Please select a source city.');
    if (!destination) return setError('Please select a destination city.');
    if (source.name === destination.name) return setError('Source and destination must be different.');

    setLoading(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Not authenticated. Please log in.');

      const { data, error: dbErr } = await supabase
        .from('shipments')
        .insert({
          display_id:   generateDisplayId(),
          user_id:      user.id,
          type,
          vehicle_type: vehicleType,
          source:      { name: source.name, lat: source.lat, lng: source.lng },
          destination: { name: destination.name, lat: destination.lat, lng: destination.lng },
          status:       'in_transit',
          current_step: 0,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;
      // After creation go to Live Map to watch it in real time
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
          <p className="text-slate-500 text-sm mt-1">Select the shipment mode to continue.</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <button onClick={() => selectType('land')}
            className="group bg-[#050810] border border-white/5 hover:border-cyan-500/50 rounded-3xl p-10 flex flex-col items-center gap-5 transition-all hover:bg-cyan-500/5">
            <div className="p-5 rounded-2xl bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-all">
              <Truck size={40} className="text-cyan-400" />
            </div>
            <span className="text-white font-black uppercase tracking-widest text-sm">Land</span>
            <span className="text-slate-500 text-xs text-center">Road freight across 5 high-risk corridors</span>
          </button>
          <button onClick={() => selectType('water')}
            className="group bg-[#050810] border border-white/5 hover:border-sky-500/50 rounded-3xl p-10 flex flex-col items-center gap-5 transition-all hover:bg-sky-500/5">
            <div className="p-5 rounded-2xl bg-sky-500/10 group-hover:bg-sky-500/20 transition-all">
              <Ship size={40} className="text-sky-400" />
            </div>
            <span className="text-white font-black uppercase tracking-widest text-sm">Water</span>
            <span className="text-slate-500 text-xs text-center">Maritime shipping · Indian Ocean routes</span>
          </button>
        </div>
      </div>
    );
  }

  const isWater = type === 'water';

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <button onClick={() => setStep(1)} className="p-2 text-slate-500 hover:text-white transition rounded-xl hover:bg-white/5">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Shipment Details</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isWater ? 'Maritime freight · fill in route & vessel info.' : 'Land freight · fill in route & vehicle info.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            {isWater ? <Ship size={11} /> : <Truck size={11} />} {isWater ? 'Vessel Type' : 'Vehicle Type'}
          </label>
          <select value={vehicleType} onChange={e => setVehicleType(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 p-4 rounded-xl text-white focus:border-cyan-500 outline-none transition">
            {VEHICLE_TYPES[type].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <GeoSearchInput label="Source" value={source} onSelect={setSource} />
          <GeoSearchInput label="Destination" value={destination} onSelect={setDest} />
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{error}</div>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-cyan-500 text-black py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-[0_10px_30px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2 disabled:opacity-50">
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Creating…</>
            : <>Create &amp; Go Live <ArrowRight size={18} /></>}
        </button>
      </form>
    </div>
  );
}
