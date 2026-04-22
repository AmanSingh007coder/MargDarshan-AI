import { useEffect, useState, useCallback } from 'react';
import {
  Shield, RefreshCw, AlertTriangle, Ban,
  Eye, Trash2, Activity, Zap, Lock,
} from 'lucide-react';
import { supabase } from '../utils/supabase';

const RISK_COLOR = (s) => {
  if (s >= 80) return 'text-red-400 bg-red-500/10 border-red-500/30';
  if (s >= 60) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
  if (s >= 30) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
};

const RISK_LABEL = (s) => {
  if (s >= 80) return 'CRITICAL';
  if (s >= 60) return 'HIGH';
  if (s >= 30) return 'MEDIUM';
  return 'LOW';
};

function StatCard({ icon: Icon, label, value, color = 'text-cyan-400' }) {
  return (
    <div className="bg-[#050810] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function SecurityDashboard() {
  const [events, setEvents]     = useState([]);
  const [blocked, setBlocked]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('events');
  const [blockingIp, setBlockingIp] = useState('');
  const [newBlockIp, setNewBlockIp] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [evRes, blRes] = await Promise.all([
      supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('blocked_ips')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false }),
    ]);
    setEvents(evRes.data || []);
    setBlocked(blRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    // Real-time updates
    const channel = supabase
      .channel('security')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_events' },
        payload => setEvents(prev => [payload.new, ...prev].slice(0, 100))
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchData]);

  const blockIp = async (ip) => {
    setBlockingIp(ip);
    await supabase.from('blocked_ips').upsert({
      ip, reason: 'Manual block via security dashboard', active: true,
    }, { onConflict: 'ip' });
    await fetchData();
    setBlockingIp('');
  };

  const unblockIp = async (ip) => {
    await supabase.from('blocked_ips').update({ active: false }).eq('ip', ip);
    await fetchData();
  };

  const manualBlock = async (e) => {
    e.preventDefault();
    if (!newBlockIp.trim()) return;
    await blockIp(newBlockIp.trim());
    setNewBlockIp('');
  };

  const criticalCount = events.filter(e => e.risk_score >= 80).length;
  const highCount     = events.filter(e => e.risk_score >= 60 && e.risk_score < 80).length;
  const uniqueIPs     = new Set(events.map(e => e.ip_address)).size;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
            <Shield size={22} className="text-red-400" /> Security Center
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Honeypot alerts · IP blocklist · Attack patterns</p>
        </div>
        <button onClick={fetchData} className="p-2 text-slate-500 hover:text-white transition rounded-xl hover:bg-white/5">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Activity}      label="Total Events"   value={events.length}   color="text-cyan-400" />
        <StatCard icon={AlertTriangle} label="Critical"       value={criticalCount}   color="text-red-400" />
        <StatCard icon={Zap}           label="High Risk"      value={highCount}        color="text-orange-400" />
        <StatCard icon={Ban}           label="Blocked IPs"    value={blocked.length}  color="text-purple-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1 w-fit">
        {[['events', 'Security Events'], ['blocked', 'Blocked IPs']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${
              tab === key ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Events table */}
      {tab === 'events' && (
        <div className="bg-[#050810] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-white/[0.02] text-[10px] text-slate-500 uppercase tracking-widest font-black">
                <th className="p-4">Risk</th>
                <th className="p-4">IP Address</th>
                <th className="p-4">Method · Path</th>
                <th className="p-4">Attack Type</th>
                <th className="p-4">User Agent</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500 text-sm">Loading…</td></tr>
              )}
              {!loading && events.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                  <Shield className="mx-auto mb-2 text-emerald-400" size={24} />
                  No security events yet — system is clean.
                </td></tr>
              )}
              {events.map(ev => (
                <tr key={ev.id} className={`hover:bg-white/[0.01] transition-colors ${ev.risk_score >= 80 ? 'bg-red-500/[0.02]' : ''}`}>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-black ${RISK_COLOR(ev.risk_score)}`}>
                      {RISK_LABEL(ev.risk_score)} {ev.risk_score}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-300">{ev.ip_address}</td>
                  <td className="p-4">
                    <span className={`font-mono text-[10px] font-black mr-2 ${
                      ['POST','PUT','DELETE'].includes(ev.method) ? 'text-orange-400' : 'text-cyan-400'
                    }`}>{ev.method}</span>
                    <span className="text-slate-400 text-xs truncate max-w-[140px] inline-block align-middle">{ev.path}</span>
                  </td>
                  <td className="p-4 text-xs text-slate-400">
                    {(ev.attack_types || []).join(', ') || <span className="text-slate-600">Honeypot probe</span>}
                  </td>
                  <td className="p-4 text-xs text-slate-500 max-w-[160px] truncate" title={ev.user_agent}>
                    {ev.user_agent || '—'}
                  </td>
                  <td className="p-4 text-right">
                    {!blocked.some(b => b.ip === ev.ip_address) && (
                      <button
                        onClick={() => blockIp(ev.ip_address)}
                        disabled={blockingIp === ev.ip_address}
                        className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest flex items-center gap-1 ml-auto transition"
                      >
                        <Ban size={11} /> Block
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Blocked IPs */}
      {tab === 'blocked' && (
        <div className="space-y-4">
          {/* Manual block form */}
          <form onSubmit={manualBlock} className="flex gap-3">
            <input
              type="text"
              placeholder="Enter IP address to block (e.g. 192.168.1.1)"
              value={newBlockIp}
              onChange={e => setNewBlockIp(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl text-white text-sm focus:border-red-500 outline-none transition placeholder-slate-600"
            />
            <button type="submit"
              className="bg-red-500 hover:bg-red-400 text-white font-black px-5 rounded-xl text-sm uppercase tracking-widest transition flex items-center gap-2">
              <Lock size={14} /> Block
            </button>
          </form>

          <div className="bg-[#050810] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white/[0.02] text-[10px] text-slate-500 uppercase tracking-widest font-black">
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Blocked At</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {blocked.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500 text-sm">No blocked IPs.</td></tr>
                )}
                {blocked.map(b => (
                  <tr key={b.id} className="hover:bg-white/[0.01]">
                    <td className="p-4 font-mono text-red-400 text-xs font-black">{b.ip}</td>
                    <td className="p-4 text-slate-400 text-xs">{b.reason}</td>
                    <td className="p-4 text-slate-500 text-xs font-mono">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => unblockIp(b.ip)}
                        className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition"
                      >
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
