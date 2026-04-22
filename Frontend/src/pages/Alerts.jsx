import { AlertTriangle, Eye, Zap, Navigation } from 'lucide-react';

const alerts = [
  { id: '05-841', type: 'Fatigue Detected', loc: 'Jayanagar', time: '2 mins ago', severity: 'HIGH' },
  { id: '05-832', type: 'Sudden Brake Detected', loc: 'Koramangala', time: '5 mins ago', severity: 'MEDIUM' },
  { id: '05-901', type: 'Route Deviation Detected', loc: 'Banashankari', time: '12 mins ago', severity: 'HIGH' },
  { id: '05-772', type: 'Driver Fatigue', loc: 'Indiranagar', time: '18 mins ago', severity: 'HIGH' },
];

export default function Alerts() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">AI Anomalies</h1>
      </div>

      <div className="grid gap-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-[#050810] border border-white/5 p-6 rounded-2xl flex items-center justify-between group hover:border-red-500/30 transition-all">
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-xl ${alert.severity === 'HIGH' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                {alert.type.includes('Fatigue') ? <Eye size={24} /> : alert.type.includes('Brake') ? <Zap size={24} /> : <Navigation size={24} />}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{alert.type}</h3>
                <p className="text-slate-500 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span> {alert.loc} 
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span> {alert.time}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-600 block mb-1">ID: {alert.id}</span>
              <span className={`text-[10px] font-black px-2 py-1 rounded border ${alert.severity === 'HIGH' ? 'border-red-500/50 text-red-500' : 'border-orange-500/50 text-orange-500'}`}>
                {alert.severity} SEVERITY
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}