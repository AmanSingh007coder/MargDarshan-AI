import { Users, Truck, AlertTriangle, TrendingUp, Clock, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', fuel: 400 },
  { name: 'Tue', fuel: 300 },
  { name: 'Wed', fuel: 500 },
  { name: 'Thu', fuel: 280 },
  { name: 'Fri', fuel: 590 },
];

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-card border border-slate-800 p-6 rounded-2xl shadow-lg">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="text-white" size={20} />
      </div>
    </div>
  </div>
);

export default function Overview() {
  const recentAlerts = [
    { id: 1, title: 'Sudden Braking', truck: '#DS-094', loc: 'Jayanagar', time: '2m ago' },
    { id: 2, title: 'Route Deviation', truck: '#DS-012', loc: 'Koramangala', time: '5m ago' },
    { id: 3, title: 'Driver Fatigue', truck: '#DS-055', loc: 'Indiranagar', time: '12m ago' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fleet Intelligence</h1>
          <p className="text-slate-500 text-sm italic">Real-time analytics for Bengaluru region</p>
        </div>
        <div className="bg-brand/10 text-brand px-4 py-2 rounded-full text-sm font-bold border border-brand/20 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Live System Active
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Trucks" value="18" icon={Truck} color="bg-blue-600" />
        <StatCard title="Drivers" value="24" icon={Users} color="bg-purple-600" />
        <StatCard title="Anomalies" value="03" icon={AlertTriangle} color="bg-orange-500" />
        <StatCard title="Efficiency" value="+12%" icon={TrendingUp} color="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fuel Consumption Chart */}
        <div className="bg-card border border-slate-800 p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-bold text-white mb-6">Fuel Efficiency (Last 5 Days)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
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

        {/* Recent Alerts with GLOWING DOTS */}
        <div className="bg-card border border-slate-800 p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-bold text-white mb-6">Critical Alerts</h2>
          <div className="space-y-4">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-brand/30 transition-all cursor-default group">
                {/* GLOWING DOT CONTAINER */}
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_10px_#ef4444]"></span>
                </div>
                
                <div className="flex-1">
                  <p className="text-sm font-bold text-white group-hover:text-brand transition-colors">{alert.title} - {alert.truck}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider font-bold">
                      <MapPin size={10} /> {alert.loc}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider font-bold border-l border-slate-700 pl-3">
                      <Clock size={10} /> {alert.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}