import { useState } from 'react';
import Map from '../components/Map';
import { MapPin, Radio } from 'lucide-react';

export default function LiveMap() {
  // Local "Mock" data for your Bengaluru fleet
  const [trucks] = useState([
    { id: 1, name: 'Truck DS-01 (Active)', lat: 12.9226, lng: 77.5175, status: 'Moving' }, 
    { id: 2, name: 'Truck DS-02 (Idle)', lat: 12.9716, lng: 77.5946, status: 'Stopped' },
    { id: 3, name: 'Truck DS-03 (At Risk)', lat: 12.9352, lng: 77.6245, status: 'Moving' },
  ]);

  return (
    <div className="space-y-6">
      {/* Header with status indicators */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fleet Tracking</h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
            <Radio className="text-green-500 animate-pulse" size={16} /> 
            Live GPS telemetry from 3 active units
          </p>
        </div>
        
        <div className="flex gap-3">
          <div className="bg-card border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-2">
            <MapPin className="text-brand" size={18} />
            <span className="text-sm font-semibold text-white">Bengaluru, KA</span>
          </div>
        </div>
      </div>

      {/* THE MAP CONTAINER */}
      <div className="bg-card border border-slate-800 p-2 rounded-2xl shadow-2xl overflow-hidden">
        {/* We use h-[600px] to give it a nice large viewing area */}
        <div className="h-[600px] w-full rounded-xl overflow-hidden relative">
          <Map trucks={trucks} />
          
          {/* Overlay for map legend */}
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

      {/* Quick Status Cards below the map */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trucks.map(truck => (
          <div key={truck.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
            <div>
              <p className="text-white font-bold text-sm">{truck.name}</p>
              <p className="text-slate-500 text-xs">{truck.lat.toFixed(4)}, {truck.lng.toFixed(4)}</p>
            </div>
            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
              truck.status === 'Moving' ? 'bg-green-500/10 text-green-500' : 'bg-slate-700 text-slate-400'
            }`}>
              {truck.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}