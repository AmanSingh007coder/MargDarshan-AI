import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import api from '../utils/api';

const fuelData = [
  { name: 'Mon', fuel: 400 },
  { name: 'Tue', fuel: 580 },
  { name: 'Wed', fuel: 480 },
  { name: 'Thu', fuel: 520 },
  { name: 'Fri', fuel: 600 },
];

export default function Dashboard() {
  const [activeTrucks, setActiveTrucks] = useState('--');
  const [anomalies, setAnomalies] = useState('--');
  const [recentAlerts, setRecentAlerts] = useState([]);

  useEffect(() => {
    api.get('/api/shipments/active')
      .then(data => {
        setActiveTrucks(data.length);
        // Unique drivers from active shipments
      })
      .catch(() => {});

    api.get('/api/alerts', { acknowledged: false, limit: 10 })
      .then(data => {
        setAnomalies(data.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length);
        setRecentAlerts(data.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  const stats = [
    { label: 'Active Trucks', val: String(activeTrucks), icon: Activity, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { label: 'Drivers',       val: '24',                 icon: Users,     color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
    { label: 'Anomalies',     val: String(anomalies).padStart(2, '0'), icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    { label: 'Efficiency',    val: '+12%',               icon: TrendingUp, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">MargDarshan-AI</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time analytics for Indian highway corridors</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live System Active</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-[#050810] border border-white/5 p-6 rounded-3xl hover:border-white/10 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: s.bg, color: s.color }}>
                <s.icon size={22} />
              </div>
            </div>
            <h3 className="text-4xl font-black text-white tracking-tighter mb-1">{s.val}</h3>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#050810] border border-white/5 p-8 rounded-[2.5rem]">
          <h3 className="text-white font-black uppercase tracking-widest text-xs mb-10 flex items-center gap-2">
            Fuel Efficiency <span className="text-slate-400 font-normal">(Last 5 Days)</span>
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#050810', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="fuel" radius={[6, 6, 0, 0]} barSize={50}>
                  {fuelData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 4 ? '#3b82f6' : 'rgba(59, 130, 246, 0.4)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#050810] border border-white/5 p-8 rounded-[2.5rem]">
          <h3 className="text-white font-black uppercase tracking-widest text-xs mb-8">Critical Alerts</h3>
          <div className="space-y-8">
            {recentAlerts.length === 0 && (
              <p className="text-slate-600 text-xs">No active alerts.</p>
            )}
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-4 group cursor-pointer">
                <div className="relative mt-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-ping absolute"></div>
                  <div className="w-2 h-2 bg-red-500 rounded-full relative"></div>
                </div>
                <div>
                  <p className="text-white text-xs font-black uppercase tracking-tight group-hover:text-red-400 transition">
                    {alert.alert_type?.replace(/_/g, ' ')}
                  </p>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                    {alert.severity} • {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
