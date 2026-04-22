import { useEffect, useRef, useState } from 'react';
import Map from '../components/Map';
import { MapPin, Radio } from 'lucide-react';
import api from '../utils/api';

const STATUS_COLOR = {
  IN_TRANSIT: 'bg-green-500/10 text-green-500',
  AT_RISK:    'bg-orange-500/10 text-orange-500',
  REROUTED:   'bg-purple-500/10 text-purple-500',
  DELIVERED:  'bg-slate-700 text-slate-400',
};

export default function LiveMap() {
  const [trucks, setTrucks] = useState([]);
  const [error, setError]   = useState('');
  const intervalRef         = useRef(null);

  const fetchTrucks = () => {
    api.get('/api/shipments/active')
      .then(data => {
        setTrucks(
          data
            .filter(s => s.current_lat && s.current_lng)
            .map(s => ({
              id:     s.id,
              name:   `Truck ${s.truck_id}`,
              lat:    s.current_lat,
              lng:    s.current_lng,
              status: s.status,
              risk:   s.current_risk_score || 0,
            }))
        );
      })
      .catch(err => setError(err.response?.data?.error || 'Could not load live positions.'));
  };

  useEffect(() => {
    fetchTrucks();
    intervalRef.current = setInterval(fetchTrucks, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fleet Tracking</h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
            <Radio className="text-green-500 animate-pulse" size={16} />
            Live GPS telemetry · {trucks.length} active unit{trucks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="bg-card border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-2">
          <MapPin className="text-brand" size={18} />
          <span className="text-sm font-semibold text-white">India — 5 Corridors</span>
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{error}</div>
      )}

      <div className="bg-card border border-slate-800 p-2 rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-[600px] w-full rounded-xl overflow-hidden relative">
          <Map trucks={trucks} />
          <div className="absolute bottom-4 left-4 z-[1000] bg-dark/80 backdrop-blur-md border border-slate-700 p-3 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-slate-300">Fleet Location</span>
            </div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
              Powered by MargDarshan AI
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trucks.map(truck => (
          <div key={truck.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
            <div>
              <p className="text-white font-bold text-sm">{truck.name}</p>
              <p className="text-slate-500 text-xs">{truck.lat.toFixed(4)}, {truck.lng.toFixed(4)}</p>
              {truck.risk > 0 && (
                <p className="text-xs mt-1" style={{ color: truck.risk >= 80 ? '#ef4444' : truck.risk >= 60 ? '#f97316' : '#94a3b8' }}>
                  Risk: {truck.risk.toFixed(1)}%
                </p>
              )}
            </div>
            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLOR[truck.status] || STATUS_COLOR.IN_TRANSIT}`}>
              {truck.status?.replace('_', ' ')}
            </span>
          </div>
        ))}
        {trucks.length === 0 && !error && (
          <p className="text-slate-600 text-sm col-span-3 text-center py-4">No active trucks. Create a shipment to begin tracking.</p>
        )}
      </div>
    </div>
  );
}
