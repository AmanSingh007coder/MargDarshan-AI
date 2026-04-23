import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation, RefreshCw, Truck, Ship, MapPin, Calendar, Download } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { generateShipmentReportPDF } from '../utils/generateShipmentReport';

const STATUS_THEME = {
  in_transit: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  fulfilled: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const STATUS_LABEL = {
  in_transit: 'In Transit',
  fulfilled: 'Delivered',
  cancelled: 'Aborted',
};

export default function MyShipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">My Shipments</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Logistics Command Center</p>
        </div>
        <button
          onClick={fetchShipments}
          className="p-3 bg-white/5 text-slate-400 hover:text-white transition-all rounded-xl border border-white/5 hover:bg-white/10"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-xs font-bold uppercase tracking-widest bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
          Manifest Error: {error}
        </div>
      )}

      {/* Grid Layout */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 bg-white/[0.02] border border-white/5 rounded-[32px] animate-pulse" />
          ))}
        </div>
      ) : shipments.length === 0 ? (
        <div className="py-24 text-center bg-white/[0.01] border border-white/5 rounded-[40px] border-dashed">
          <Truck className="text-slate-800 mx-auto mb-4" size={40} />
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest">No Active Manifests</p>
          <Link to="/dashboard/new-shipment" className="text-cyan-500 text-[10px] font-black uppercase tracking-widest mt-6 inline-block border border-cyan-500/20 px-6 py-2 rounded-full hover:bg-cyan-500/10 transition-all">
            Deploy New Shipment
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shipments.map((s) => (
            <div 
              key={s.id} 
              className="group bg-[#0A0F1C] border border-white/5 rounded-[32px] p-6 transition-all duration-500 hover:border-white/20 hover:bg-[#0D1424] flex flex-col justify-between shadow-2xl"
            >
              <div className="relative space-y-6">
                {/* Header: Type & Status */}
                <div className="flex justify-between items-center">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-slate-300 group-hover:text-cyan-400 group-hover:border-cyan-500/20 transition-all">
                    {s.type === 'water' ? <Ship size={20} /> : <Truck size={20} />}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_THEME[s.status] || STATUS_THEME.in_transit}`}>
                    {STATUS_LABEL[s.status] || s.status}
                  </span>
                </div>

                {/* ID & Vehicle */}
                <div>
                  <h3 className="text-white font-black font-mono text-xl tracking-tight uppercase group-hover:text-cyan-500 transition-colors">{s.display_id}</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">{s.vehicle_type}</p>
                </div>

                {/* Discrete Gradient Path Visualizer */}
                <div className="space-y-1 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] z-10" />
                    <span className="text-xs font-black text-slate-200 truncate tracking-tight">{s.source?.name}</span>
                  </div>
                  
                  {/* The Discrete Gradient Line */}
                  <div className="ml-1 flex flex-col gap-1 py-1">
                    <div className="w-[2px] h-2 bg-gradient-to-b from-cyan-500 to-yellow-400 rounded-full ml-[3px]" />
                    <div className="w-[2px] h-2 bg-yellow-400 rounded-full ml-[3px] opacity-60" />
                    <div className="w-[2px] h-2 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full ml-[3px]" />
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin size={14} className="text-orange-500 fill-orange-500/20" />
                    <span className="text-xs font-black text-slate-200 truncate tracking-tight">{s.destination?.name}</span>
                  </div>
                </div>

                {/* Metadata Footer */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex items-center gap-1.5 text-white text-[9px] font-bold uppercase tracking-[0.2em]">
                    <Calendar size={12} />
                    {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8">
                {s.status === 'in_transit' ? (
                  <Link
                    to={`/dashboard/map/${s.id}`}
                    className="block w-full bg-cyan-500 text-black hover:bg-cyan-600 hover:text-white text-center py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-xl active:scale-[0.98]"
                  >
                    Track
                  </Link>
                ) : s.status === 'fulfilled' ? (
                  <button
                    onClick={() => generateShipmentReportPDF(s)}
                    className="w-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-500/60 text-center py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Download size={12} /> Download Report
                  </button>
                ) : (
                  <div className="w-full bg-white/[0.02] text-slate-700 text-center py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] border border-white/5">
                    {s.status === 'cancelled' ? 'Cancelled' : 'Archived'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}