import { Search, Filter, Map, Info } from 'lucide-react';

const initialShipments = [
  { id: 'SHP-9021', truck: 'MH-12-FE-4421', origin: 'Mumbai', dest: 'Bangalore', status: 'IN_TRANSIT', risk: 12, eta: '4h 20m' },
  { id: 'SHP-8842', truck: 'KA-01-AB-9920', origin: 'Pune', dest: 'Delhi', status: 'AT_RISK', risk: 88, eta: '12h 05m' },
  { id: 'SHP-7719', truck: 'DL-04-GH-1102', origin: 'Nagpur', dest: 'Mumbai', status: 'REROUTED', risk: 45, eta: '2h 15m' },
  { id: 'SHP-6620', truck: 'TN-02-JK-5581', origin: 'Chennai', dest: 'Hyderabad', status: 'DELIVERED', risk: 0, eta: '-' },
];

const statusStyles = {
  IN_TRANSIT: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  AT_RISK: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  REROUTED: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  DELIVERED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  DELAYED: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function MyShipments() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">My Shipments</h1>
      </div>
      <div className="bg-[#050810] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse font-sans">
          <thead>
            <tr className="bg-white/[0.02] text-[10px] text-slate-500 uppercase tracking-widest font-black">
              <th className="p-5">Shipment ID</th>
              <th className="p-5">Truck ID</th>
              <th className="p-5">Route</th>
              <th className="p-5">Status</th>
              <th className="p-5">Risk</th>
              <th className="p-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {initialShipments.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.01] transition-colors">
                <td className="p-5 font-mono text-cyan-500 text-xs font-bold">{s.id}</td>
                <td className="p-5 text-sm text-slate-200 font-bold">{s.truck}</td>
                <td className="p-5 text-sm text-slate-400">{s.origin} → {s.dest}</td>
                <td className="p-5">
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black border ${statusStyles[s.status]}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-5">
                   <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{ width: `${s.risk}%` }} />
                   </div>
                </td>
                <td className="p-5 text-right space-x-2">
                  <button className="p-2 text-slate-500 hover:text-cyan-400 transition"><Map size={16} /></button>
                  <button className="p-2 text-slate-500 hover:text-white transition"><Info size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}