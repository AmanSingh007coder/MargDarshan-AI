import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Navigation, Package, Calendar, ArrowRight } from 'lucide-react';

const cities = ["Mumbai", "Pune", "Nashik", "Nagpur", "Bangalore", "Delhi", "Hyderabad", "Chennai"];
const cargoTypes = ["Pharmaceuticals", "Electronics", "FMCG", "Automotive Parts", "Perishables"];

export default function NewShipment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/dashboard/shipments');
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Initiate Protocol</h1>
        <p className="text-slate-500 font-sans text-sm">Deploy neural tracking for a new fleet unit.</p>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Truck size={12}/> Truck ID</label>
          <input required type="text" placeholder="MH-12-AB-1234" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:border-cyan-500 outline-none transition" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Driver Name</label>
          <input required type="text" placeholder="Full Name" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:border-cyan-500 outline-none transition" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Navigation size={12}/> Origin</label>
          <select className="w-full bg-slate-900 border border-white/10 p-4 rounded-xl text-white focus:border-cyan-500 outline-none transition">
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Navigation size={12}/> Destination</label>
          <select className="w-full bg-slate-900 border border-white/10 p-4 rounded-xl text-white focus:border-cyan-500 outline-none transition">
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Package size={12}/> Cargo</label>
          <select className="w-full bg-slate-900 border border-white/10 p-4 rounded-xl text-white focus:border-cyan-500 outline-none transition">
            {cargoTypes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Calendar size={12}/> Departure</label>
          <input type="datetime-local" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:border-cyan-500 outline-none transition" />
        </div>
        <div className="md:col-span-2 pt-4">
          <button type="submit" disabled={loading} className="w-full bg-cyan-500 text-black py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-[0_10px_30px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2">
            {loading ? "Syncing..." : <>Start Tracking Shipment <ArrowRight size={18} /></>}
          </button>
        </div>
      </form>
    </div>
  );
}