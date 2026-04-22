import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import axios from 'axios';
import {
  Ship, ArrowLeft, Loader2, AlertTriangle, MapPin, Fuel, Clock,
  Waves, Wind, Anchor, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import { generateDisplayId } from '../utils/idGenerator';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PORT_ICON = L.divIcon({
  html: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="12" fill="#0f2a1e" stroke="#10b981" stroke-width="2"/>
    <rect x="11" y="9" width="6" height="10" rx="1" fill="none" stroke="#10b981" stroke-width="1.5"/>
    <line x1="8" y1="19" x2="20" y2="19" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
});

export default function WaterShipment() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  const [ports, setPorts] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [originPort, setOriginPort] = useState('');
  const [destPort, setDestPort] = useState('');
  const [vesselType, setVesselType] = useState('bulk_carrier');
  const [quantity, setQuantity] = useState(5000);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);

  // Fetch ports and vessels on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [portsRes, vesselsRes] = await Promise.all([
          axios.get('http://localhost:8888/water/ports', { timeout: 5000 }),
          axios.get('http://localhost:8888/water/vessels', { timeout: 5000 }),
        ]);
        setPorts(portsRes.data.ports);
        setVessels(vesselsRes.data.vessels);
        if (portsRes.data.ports.length > 0) {
          setOriginPort(portsRes.data.ports[0].name);
          setDestPort(portsRes.data.ports[1]?.name || '');
        }
      } catch (err) {
        const errorMsg = err.response?.status === 404
          ? 'Backend endpoints not found. Ensure FastAPI server running on port 8080 with /water/ports, /water/vessels endpoints'
          : err.code === 'ECONNABORTED'
          ? 'Connection timeout. FastAPI server not responding on localhost:8888'
          : `Failed to load ports/vessels: ${err.message}`;
        setError(errorMsg);
        console.error('Fetch error:', err);
      }
    };
    fetchData();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { center: [12, 75], zoom: 5 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    ports.forEach(p =>
      L.marker([p.lat, p.lng], { icon: PORT_ICON })
        .bindPopup(`<b style="color:#10b981;font-family:monospace">${p.name}</b>`)
        .addTo(map)
    );

    mapRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapRef.current = null; };
  }, [ports]);

  // Draw route on map when calculated
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;

    map.eachLayer(l => { if (l._isRoute) map.removeLayer(l); });

    const coords = route.waypoints.map(w => [w.lat, w.lng]);
    const poly = L.polyline(coords, {
      color: '#06b6d4',
      weight: 3,
      opacity: 0.8,
      dashArray: '5, 5',
    });
    poly._isRoute = true;
    poly.addTo(map);

    // Fit bounds to route
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [route]);

  const handleCalculateRoute = async () => {
    if (!originPort || !destPort) {
      setError('Select both origin and destination ports');
      return;
    }

    const origin = ports.find(p => p.name === originPort);
    const dest = ports.find(p => p.name === destPort);

    if (!origin || !dest) {
      setError('Invalid port selection');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:8000/water/route', {
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_lat: dest.lat,
        destination_lng: dest.lng,
        vessel_type: vesselType,
        quantity_tons: quantity,
      });

      setRoute(res.data);
    } catch (err) {
      setError(`Route calculation failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoute = async () => {
    if (!route || !originPort || !destPort) {
      setError('Calculate and select a route first');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Not authenticated');

      const origin = ports.find(p => p.name === originPort);
      const dest = ports.find(p => p.name === destPort);

      const { error: dbErr } = await supabase.from('shipments').insert({
        display_id: generateDisplayId(),
        user_id: user.id,
        type: 'water',
        vehicle_type: vesselType,
        source: { name: origin.name, lat: origin.lat, lng: origin.lng },
        destination: { name: dest.name, lat: dest.lat, lng: dest.lng },
        status: 'in_transit',
        current_step: 0,
      });

      if (dbErr) throw dbErr;
      navigate('/dashboard/map');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] -m-8 flex">
      {/* Control Panel */}
      <div className="w-80 bg-black/80 backdrop-blur-md border-r border-white/10 flex flex-col z-10 overflow-y-auto shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-white text-xs mb-3 transition"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-xl">
              <Ship size={18} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-white font-black text-sm uppercase tracking-tight">Cargo Router</p>
              <p className="text-slate-500 text-[10px]">Water Shipment Planner</p>
            </div>
          </div>
        </div>

        {/* Port Selection */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">
              Origin Port
            </label>
            <select
              value={originPort}
              onChange={e => setOriginPort(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-white text-sm focus:border-cyan-500 outline-none"
            >
              <option value="">Select port...</option>
              {ports.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">
              Destination Port
            </label>
            <select
              value={destPort}
              onChange={e => setDestPort(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-white text-sm focus:border-cyan-500 outline-none"
            >
              <option value="">Select port...</option>
              {ports.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vessel & Cargo Selection */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">
              Vessel Type
            </label>
            <select
              value={vesselType}
              onChange={e => setVesselType(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-white text-sm focus:border-cyan-500 outline-none"
            >
              {vessels.map(v => (
                <option key={v.name} value={v.type}>
                  {v.name} ({v.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">
              Cargo Quantity (tons)
            </label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-white text-sm focus:border-cyan-500 outline-none"
            />
          </div>

          <button
            onClick={handleCalculateRoute}
            disabled={loading || !originPort || !destPort}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-black py-3 rounded-xl text-sm uppercase tracking-widest transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Calculating...
              </>
            ) : (
              <>
                <Anchor size={15} /> Calculate Route
              </>
            )}
          </button>
        </div>

        {/* Route Summary */}
        {route && (
          <div className="p-4 border-b border-white/10 space-y-4">
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <MapPin size={12} className="text-cyan-400" /> Distance
                </span>
                <span className="text-white font-black text-sm">{route.distance_nm} NM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <Clock size={12} className="text-sky-400" /> ETA
                </span>
                <span className="text-white font-black text-sm">{route.eta_hours}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <Fuel size={12} className="text-amber-400" /> Fuel Cost
                </span>
                <span className="text-white font-black text-sm">₹{route.cost_breakdown.fuel.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-cyan-400 text-xs font-black">Total Cost</span>
                <span className="text-white font-black text-lg">₹{route.cost_estimate.toLocaleString()}</span>
              </div>
              <p className="text-slate-400 text-xs">
                ₹{route.cost_per_ton.toLocaleString()} per ton
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/[0.03] border border-white/5 rounded p-2">
                <p className="text-slate-500 mb-1">Port Fees</p>
                <p className="text-white font-black">₹{route.cost_breakdown.port_fees.toLocaleString()}</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded p-2">
                <p className="text-slate-500 mb-1">Crew Cost</p>
                <p className="text-white font-black">₹{route.cost_breakdown.crew.toLocaleString()}</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded p-2">
                <p className="text-slate-500 mb-1">Insurance</p>
                <p className="text-white font-black">₹{route.cost_breakdown.insurance.toLocaleString()}</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded p-2">
                <p className="text-slate-500 mb-1">Misc</p>
                <p className="text-white font-black">₹{route.cost_breakdown.misc.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 mt-auto space-y-2">
          {error && (
            <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <button
            onClick={handleSaveRoute}
            disabled={!route || saving}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-black py-3 rounded-xl text-sm uppercase tracking-widest transition"
          >
            {saving ? <Loader2 size={15} className="inline animate-spin mr-2" /> : null}
            {saving ? 'Saving...' : 'Create Shipment'}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#020617]/80 z-[500]">
            <Loader2 size={28} className="text-cyan-400 animate-spin" />
          </div>
        )}

        {/* Marine Conditions Info Overlay */}
        {route && (
          <div className="absolute bottom-6 right-6 max-w-xs bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-4 text-sm z-40">
            <p className="text-cyan-400 font-black text-xs mb-2">ROUTE DETAILS</p>
            <div className="space-y-1.5 text-slate-300 text-xs">
              <p>
                <span className="text-white font-bold">Origin:</span>{' '}
                {originPort?.split(' ').slice(0, 2).join(' ')}
              </p>
              <p>
                <span className="text-white font-bold">Destination:</span>{' '}
                {destPort?.split(' ').slice(0, 2).join(' ')}
              </p>
              <p>
                <span className="text-white font-bold">Distance:</span> {route.distance_km.toFixed(0)} km
              </p>
              <p>
                <span className="text-white font-bold">Vessel:</span> {vesselType}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
