import { useState, useEffect, useRef, useCallback } from 'react';
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

/* ── 3D Card Component ─────────────────────────────────────────────────────── */

function ShipmentCard3D({ type, onClick, imageUrl, icon, title, subtitle, description, stats, badgeColor, glowClass, accentColor }) {
  const containerRef = useRef(null);
  const bodyRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const card = containerRef.current;
    const body = bodyRef.current;
    if (!card || !body) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;
    body.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    body.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
    setTimeout(() => { if (body) body.style.transition = 'transform 0.08s ease-out, box-shadow 0.3s ease'; }, 500);
  }, []);

  const handleMouseEnter = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.style.transition = 'transform 0.08s ease-out, box-shadow 0.3s ease';
  }, []);

  return (
    <div
      ref={containerRef}
      className={`card-3d-container ${type === 'land' ? 'land-card' : 'water-card'}`}
      style={{ perspective: '1000px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onClick={onClick}
    >
      <div
        ref={bodyRef}
        className="card-3d-body relative rounded-3xl overflow-hidden"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.08s ease-out, box-shadow 0.3s ease',
          willChange: 'transform',
          background: type === 'land'
            ? 'linear-gradient(135deg, #0a1628 0%, #050810 60%, #0a1628 100%)'
            : 'linear-gradient(135deg, #050d1a 0%, #050810 60%, #050d1a 100%)',
          border: type === 'land'
            ? '1px solid rgba(6,182,212,0.18)'
            : '1px solid rgba(56,189,248,0.18)',
        }}
      >
        {/* Gloss overlay */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '24px', zIndex: 1, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 30% 15%, rgba(255,255,255,0.06) 0%, transparent 55%)',
        }} />

        {/* Image with 3D float */}
        <div style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d', position: 'relative', zIndex: 2 }}>
          <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
            <img
              src={imageUrl}
              alt={title}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                filter: 'brightness(0.45) saturate(1.2)',
                transition: 'filter 0.3s ease, transform 0.5s ease',
              }}
              onMouseEnter={e => { e.target.style.filter = 'brightness(0.55) saturate(1.4)'; e.target.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.target.style.filter = 'brightness(0.45) saturate(1.2)'; e.target.style.transform = 'scale(1)'; }}
            />
            {/* Gradient over image */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(to bottom, transparent 30%, #050810 100%)`,
            }} />
            {/* Badge top-right */}
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeColor}`} style={{ backdropFilter: 'blur(8px)' }}>
                {subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Icon floating */}
        <div style={{
          transform: 'translateZ(60px)',
          transformStyle: 'preserve-3d',
          position: 'absolute',
          top: '130px',
          left: '24px',
          zIndex: 10,
          padding: '14px',
          borderRadius: '16px',
          background: type === 'land' ? 'rgba(6,182,212,0.12)' : 'rgba(56,189,248,0.12)',
          border: type === 'land' ? '1px solid rgba(6,182,212,0.25)' : '1px solid rgba(56,189,248,0.25)',
          backdropFilter: 'blur(8px)',
          boxShadow: type === 'land'
            ? '0 8px 32px rgba(6,182,212,0.2)'
            : '0 8px 32px rgba(56,189,248,0.2)',
          transition: 'transform 0.3s ease',
        }}
        className="icon-float"
        >
          {icon}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px 24px', position: 'relative', zIndex: 3, transformStyle: 'preserve-3d' }}>
          {/* Title */}
          <div style={{ transform: 'translateZ(50px)', marginTop: '16px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, fontStyle: 'italic', textTransform: 'uppercase' }}>
              {title}
            </h2>
          </div>

          {/* Description */}
          <div style={{ transform: 'translateZ(40px)', marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>{description}</p>
          </div>

          {/* Stats */}
          <div style={{ transform: 'translateZ(35px)', display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {stats.map(s => (
              <div key={s.label} style={{
                flex: 1, padding: '10px 8px', borderRadius: '10px', textAlign: 'center',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{ fontSize: '13px', fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{s.value}</p>
                <p style={{ fontSize: '9px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* CTA button */}
          <div style={{ transform: 'translateZ(30px)' }}>
            <button
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                fontWeight: 900, fontSize: '12px', letterSpacing: '0.15em',
                textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                background: type === 'land'
                  ? 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(6,182,212,0.1))'
                  : 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(56,189,248,0.1))',
                color: type === 'land' ? '#22d3ee' : '#38bdf8',
                borderTop: type === 'land' ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(56,189,248,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = type === 'land' ? 'rgba(6,182,212,0.3)' : 'rgba(56,189,248,0.3)'; }}
              onMouseLeave={e => {
                e.currentTarget.style.background = type === 'land'
                  ? 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(6,182,212,0.1))'
                  : 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(56,189,248,0.1))';
              }}
            >
              Select {title} Shipment <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Geo Search Input ──────────────────────────────────────────────────────── */

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

/* ── Main Page ─────────────────────────────────────────────────────────────── */

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
      navigate('/dashboard/map');
    } catch (err) {
      setError(err.message || 'Failed to create shipment.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 1: Mode Selection with 3D Cards ── */
  if (step === 1) {
    return (
      <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <style>{`
          .card-3d-container { cursor: pointer; }
          .card-3d-body { will-change: transform; }
          .icon-float { transition: transform 0.3s ease; }
          .land-card:hover .icon-float {
            animation: float-truck 2.5s ease-in-out infinite;
          }
          .water-card:hover .icon-float {
            animation: float-ship 3s ease-in-out infinite;
          }
          @keyframes float-truck {
            0%, 100% { transform: translateZ(60px) translateY(0px); }
            50% { transform: translateZ(60px) translateY(-6px); }
          }
          @keyframes float-ship {
            0%, 100% { transform: translateZ(60px) translateY(0px) rotate(-1deg); }
            50% { transform: translateZ(60px) translateY(-8px) rotate(1deg); }
          }
        `}</style>

        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Initiate Protocol</h1>
          <p className="text-slate-500 text-sm">Choose your shipment corridor type to continue.</p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <ShipmentCard3D
            type="land"
            onClick={() => selectType('land')}
            imageUrl="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=2070&auto=format&fit=crop"
            icon={<Truck size={44} className="text-cyan-400" />}
            title="Land"
            subtitle="Road Freight"
            description="5 high-risk corridors across India's mountain passes and monsoon zones."
            stats={[
              { label: 'Corridors', value: '5' },
              { label: 'Risk', value: 'HIGH' },
              { label: 'AI Reroute', value: '4s' },
            ]}
            badgeColor="bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
            glowClass="card-glow-land"
          />

          <ShipmentCard3D
            type="water"
            onClick={() => selectType('water')}
            imageUrl="https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=80&w=2070&auto=format&fit=crop"
            icon={<Ship size={44} className="text-sky-400" />}
            title="Water"
            subtitle="Maritime"
            description="Indian Ocean & Arabian Sea routes with live weather and wave alerts."
            stats={[
              { label: 'Routes', value: '12' },
              { label: 'Coverage', value: 'IOC' },
              { label: 'Wave Data', value: 'LIVE' },
            ]}
            badgeColor="bg-sky-500/10 border-sky-500/20 text-sky-400"
            glowClass="card-glow-water"
          />
        </div>
      </div>
    );
  }

  /* ── Step 2: Shipment Details ── */
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
