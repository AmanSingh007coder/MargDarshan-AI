import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation, RefreshCw } from 'lucide-react';
import { supabase } from '../utils/supabase';

const STATUS_BADGE = {
  in_transit: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  fulfilled:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  cancelled:  'bg-red-500/10 text-red-400 border-red-500/30',
};

const STATUS_LABEL = {
  in_transit: 'In Transit',
  fulfilled:  'Fulfilled',
  cancelled:  'Cancelled',
};

const TYPE_BADGE = {
  land:  'bg-cyan-500/10 text-cyan-400',
  water: 'bg-blue-500/10 text-blue-400',
};

export default function MyShipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const fetchShipments = () => {
    setLoading(true);
    setError('');
    supabase
      .from('shipments')
      .select('id, display_id, type, vehicle_type, source, destination, status, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setShipments(data || []);
        setLoading(false);
      });
  };

  useEffect(fetchShipments, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">My Shipments</h1>
        <button
          onClick={fetchShipments}
          className="p-2 text-slate-500 hover:text-white transition rounded-xl hover:bg-white/5"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{error}</div>
      )}

      <div className="bg-[#050810] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse font-sans">
          <thead>
            <tr className="bg-white/[0.02] text-[10px] text-slate-500 uppercase tracking-widest font-black">
              <th className="p-5">Shipment ID</th>
              <th className="p-5">Type</th>
              <th className="p-5">Vehicle</th>
              <th className="p-5">Route</th>
              <th className="p-5">Status</th>
              <th className="p-5 text-right">Track</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">Loading…</td>
              </tr>
            )}
            {!loading && shipments.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                  No shipments yet.{' '}
                  <Link to="/dashboard/new-shipment" className="text-cyan-400 underline">Create one.</Link>
                </td>
              </tr>
            )}
            {shipments.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.01] transition-colors">
                {/* Shipment ID */}
                <td className="p-5 font-mono text-cyan-500 text-xs font-bold">{s.display_id}</td>

                {/* Type badge */}
                <td className="p-5">
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${TYPE_BADGE[s.type] || TYPE_BADGE.land}`}>
                    {s.type}
                  </span>
                </td>

                {/* Vehicle */}
                <td className="p-5 text-sm text-slate-300 font-medium max-w-[140px] truncate">
                  {s.vehicle_type}
                </td>

                {/* Route */}
                <td className="p-5 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5">
                    {s.source?.name}
                    <Navigation size={11} className="text-slate-600 shrink-0" />
                    {s.destination?.name}
                  </span>
                </td>

                {/* Status badge */}
                <td className="p-5">
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black border ${STATUS_BADGE[s.status] || STATUS_BADGE.in_transit}`}>
                    {STATUS_LABEL[s.status] || s.status}
                  </span>
                </td>

                {/* Track link — only for in_transit */}
                <td className="p-5 text-right">
                  {s.status === 'in_transit' ? (
                    <Link
                      to={`/tracker/${s.id}`}
                      className="text-xs font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition"
                    >
                      Track →
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
