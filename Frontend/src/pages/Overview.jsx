import { useEffect, useState } from 'react';
import { Package, CheckCircle, Ship, Truck, MapPin, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../utils/supabase';

const fuelData = [
  { name: 'Mon', fuel: 400 },
  { name: 'Tue', fuel: 300 },
  { name: 'Wed', fuel: 500 },
  { name: 'Thu', fuel: 280 },
  { name: 'Fri', fuel: 590 },
];

const StatCard = ({ title, value, icon: Icon, color, loading }) => (
  <div className="bg-card border border-slate-800 p-6 rounded-2xl shadow-lg">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <h3 className="text-3xl font-bold text-white mt-1">
          {loading ? <span className="animate-pulse text-slate-600">—</span> : value}
        </h3>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="text-white" size={20} />
      </div>
    </div>
  </div>
);

export default function Overview() {
  const [stats, setStats] = useState({ active: 0, fulfilled: 0, cancelled: 0, water: 0, land: 0 });
  const [recentShipments, setRecentShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('shipments')
        .select('id, display_id, status, type, source, destination, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      const rows = data || [];
      const active    = rows.filter(s => s.status === 'in_transit').length;
      const fulfilled = rows.filter(s => s.status === 'fulfilled').length;
      const cancelled = rows.filter(s => s.status === 'cancelled').length;
      const water     = rows.filter(s => s.type === 'water').length;
      const land      = rows.filter(s => s.type === 'land').length;

      setStats({ active, fulfilled, cancelled, water, land });
      setRecentShipments(rows.filter(s => s.status === 'in_transit').slice(0, 4));
      setLoading(false);
    }
    load();
  }, []);

  const timeSince = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return 'just now';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fleet Intelligence</h1>
          <p className="text-slate-500 text-sm italic">Real-time analytics — MargDarshan Network</p>
        </div>
        <div className="bg-brand/10 text-brand px-4 py-2 rounded-full text-sm font-bold border border-brand/20 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          Live System Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Shipments"    value={stats.active}    icon={Package}     color="bg-blue-600"   loading={loading} />
        <StatCard title="Delivered"           value={stats.fulfilled} icon={CheckCircle} color="bg-green-600"  loading={loading} />
        <StatCard title="Sea Routes"          value={stats.water}     icon={Ship}        color="bg-cyan-600"   loading={loading} />
        <StatCard title="Land Routes"         value={stats.land}      icon={Truck}       color="bg-orange-500" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-slate-800 p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-bold text-white mb-6">Fuel Efficiency (Indicative)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Bar dataKey="fuel" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-slate-800 p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-bold text-white mb-6">Active Shipments</h2>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 bg-slate-900/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentShipments.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-8">No active shipments.</p>
          ) : (
            <div className="space-y-3">
              {recentShipments.map(s => (
                <div key={s.id} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                  <div className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{s.display_id}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold uppercase tracking-wider truncate">
                        <MapPin size={10} /> {s.source?.name} → {s.destination?.name}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold shrink-0">
                    <Clock size={10} /> {timeSince(s.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
