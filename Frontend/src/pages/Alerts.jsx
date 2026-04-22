import { useEffect, useState } from 'react';
import { AlertTriangle, Eye, Zap, Navigation, CheckCircle } from 'lucide-react';
import api from '../utils/api';

function iconForType(type) {
  if (type?.includes('FATIGUE') || type?.includes('Fatigue')) return <Eye size={24} />;
  if (type?.includes('BRAKE') || type?.includes('Brake')) return <Zap size={24} />;
  if (type?.includes('LANDSLIDE')) return <AlertTriangle size={24} />;
  return <Navigation size={24} />;
}

function severityStyle(severity) {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'bg-red-500/10 text-red-500 border-red-500/50';
  return 'bg-orange-500/10 text-orange-500 border-orange-500/50';
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/alerts', { acknowledged: false, limit: 50 })
      .then(setAlerts)
      .catch(err => setError(err.response?.data?.error || 'Could not load alerts.'))
      .finally(() => setLoading(false));
  }, []);

  const acknowledge = async (id) => {
    await api.patch(`/api/alerts/${id}`, { acknowledged: true });
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">AI Anomalies</h1>
        <span className="text-xs text-slate-500 font-mono">{alerts.length} unacknowledged</span>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{error}</div>
      )}

      {loading && <p className="text-slate-500 text-sm">Loading alerts...</p>}

      <div className="grid gap-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-[#050810] border border-white/5 p-6 rounded-2xl flex items-center justify-between group hover:border-red-500/30 transition-all">
            <div className="flex items-center gap-6">
              <div className={`p-4 rounded-xl ${severityStyle(alert.severity).split(' ').slice(0, 2).join(' ')}`}>
                {iconForType(alert.alert_type)}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{alert.alert_type?.replace(/_/g, ' ')}</h3>
                <p className="text-slate-500 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                  {alert.message}
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                  {timeAgo(alert.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className={`text-[10px] font-black px-2 py-1 rounded border ${severityStyle(alert.severity)}`}>
                  {alert.severity} SEVERITY
                </span>
              </div>
              <button
                onClick={() => acknowledge(alert.id)}
                className="p-2 text-slate-600 hover:text-emerald-400 transition"
                title="Acknowledge"
              >
                <CheckCircle size={18} />
              </button>
            </div>
          </div>
        ))}
        {!loading && alerts.length === 0 && !error && (
          <p className="text-slate-500 text-sm text-center py-8">No active alerts.</p>
        )}
      </div>
    </div>
  );
}
