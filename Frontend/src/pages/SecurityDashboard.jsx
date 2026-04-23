import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, RefreshCw, AlertTriangle, Ban,
  Activity, Zap, Lock, Unlock,
  Terminal, ShieldCheck, Cpu, Key, Loader2
} from 'lucide-react';
import { supabase } from '../utils/supabase';

// UI Theme Constants
const RISK_LEVELS = {
  CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]' },
  HIGH: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  MEDIUM: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  LOW: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

const getRiskMeta = (s) => {
  if (s >= 80) return { label: 'CRITICAL', ...RISK_LEVELS.CRITICAL };
  if (s >= 60) return { label: 'HIGH', ...RISK_LEVELS.HIGH };
  if (s >= 30) return { label: 'MEDIUM', ...RISK_LEVELS.MEDIUM };
  return { label: 'LOW', ...RISK_LEVELS.LOW };
};

function StatCard({ icon: Icon, label, value, colorClass, description }) {
  return (
    <div className="bg-[#0A0F1C] border border-slate-800/60 rounded-2xl p-6 transition-all hover:border-slate-700/80 hover:bg-[#0D1424]">
      <div className="flex items-center gap-5">
        <div className={`p-3 rounded-2xl bg-slate-900 border border-slate-800 ${colorClass}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-0.5">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
            <span className="text-[10px] text-slate-600 font-medium whitespace-nowrap">{description}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [mfaStatus, setMfaStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [tab, setTab] = useState('events');
  const [blockingIp, setBlockingIp] = useState('');

  const fetchMfaStatus = useCallback(async () => {
    try {
      const { data: { factors } } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp || [];
      const verified = totp.find(f => f.status === 'verified');
      setMfaStatus({
        enabled: !!verified,
        factors: totp,
        verified: verified || null,
      });
    } catch (err) {
      console.error('Failed to fetch MFA status:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [evRes, blRes] = await Promise.all([
      supabase.from('security_events').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('blocked_ips').select('*').eq('active', true).order('created_at', { ascending: false }),
    ]);
    setEvents(evRes.data || []);
    setBlocked(blRes.data || []);
    setLoading(false);
    await fetchMfaStatus();
  }, [fetchMfaStatus]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('security_live_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_events' },
        payload => setEvents(prev => [payload.new, ...prev].slice(0, 100))
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchData]);

  const handleBlock = async (ip) => {
    setBlockingIp(ip);
    await supabase.from('blocked_ips').upsert({
      ip, reason: 'Protocol Breach Detection', active: true,
    }, { onConflict: 'ip' });
    await fetchData();
    setBlockingIp('');
  };

  const handleUnblock = async (ip) => {
    await supabase.from('blocked_ips').update({ active: false }).eq('ip', ip);
    await fetchData();
  };

  const disableMfa = async () => {
    if (!mfaStatus?.verified) return;
    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: mfaStatus.verified.id,
      });
      if (error) throw error;
      await fetchMfaStatus();
    } catch (err) {
      console.error('Failed to disable MFA:', err);
    } finally {
      setMfaLoading(false);
    }
  };

  const criticalCount = events.filter(e => e.risk_score >= 80).length;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8 font-sans selection:bg-cyan-500/30">
      <div className="max-w-[1600px] mx-auto space-y-10">
        
        {/* Expanded Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
                  Security <span className="text-cyan-500">Dashboard</span>
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Global Threat Matrix Active
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl flex shadow-inner">
              {[['events', 'Threat Intelligence'], ['blocked', 'IP Prohibitions']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    tab === key
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 translate-y-[-1px]'
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button 
              onClick={fetchData} 
              className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
            >
              <RefreshCw size={20} className={`${loading ? 'animate-spin' : 'text-slate-400'}`} />
            </button>
          </div>
        </header>

        {/* Global Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard 
            icon={Activity} label="Monitoring" value={events.length} 
            colorClass="text-cyan-400" description="Active Logs"
          />
          <StatCard 
            icon={AlertTriangle} label="Critical" value={criticalCount} 
            colorClass="text-red-500" description="Anomalies"
          />
          <StatCard 
            icon={Ban} label="Blacklist" value={blocked.length} 
            colorClass="text-purple-400" description="IP Blocks"
          />
        </div>

        {/* Expanded Data Table / MFA Settings */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white flex items-center gap-3">
              {tab === 'mfa' ? (
                <><Key size={18} className="text-cyan-400" /> Two-Factor Authentication</>
              ) : tab === 'events' ? (
                <><Terminal size={18} className="text-cyan-400" /> Real-Time Event Stream</>
              ) : (
                <><Ban size={18} className="text-cyan-400" /> Active IP Prohibitions</>
              )}
            </h2>
            {tab !== 'mfa' && <span className="text-[10px] font-mono text-slate-500">Showing last 100 entries</span>}
          </div>

          {tab === 'mfa' ? (
            <div className="bg-[#050810]/80 backdrop-blur-xl border border-slate-800/50 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8">
              <div className="space-y-6">
                <div className="flex items-start gap-6">
                  <div className="p-6 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
                    <ShieldCheck size={48} className="text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                      Two-Factor Authentication (MFA)
                    </h3>
                    <p className="text-slate-400 text-sm mb-4">
                      Add an extra layer of security to your account with Google Authenticator or similar apps.
                    </p>

                    {mfaStatus ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 bg-[#020617] rounded-xl p-4 border border-slate-800">
                          <div className={`w-4 h-4 rounded-full ${mfaStatus.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                          <div className="flex-1">
                            <p className="font-semibold text-white">
                              MFA Status: <span className={mfaStatus.enabled ? 'text-emerald-400' : 'text-slate-400'}>
                                {mfaStatus.enabled ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {mfaStatus.enabled
                                ? 'Your account is protected with two-factor authentication.'
                                : 'Enable MFA to secure your account with an authenticator app.'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {mfaStatus.enabled && (
                            <button
                              onClick={disableMfa}
                              disabled={mfaLoading}
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-black text-sm uppercase tracking-widest transition disabled:opacity-50"
                            >
                              {mfaLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                              Disable MFA
                            </button>
                          )}

                          {!mfaStatus.enabled && (
                            <button
                              onClick={() => navigate('/mfa/enroll')}
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-xl font-black text-sm uppercase tracking-widest transition"
                            >
                              <Key size={16} />
                              Enable MFA
                            </button>
                          )}

                          <button
                            onClick={fetchMfaStatus}
                            disabled={mfaLoading}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/20 rounded-xl font-black text-sm uppercase tracking-widest transition disabled:opacity-50"
                          >
                            {mfaLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                            Refresh Status
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="text-cyan-400 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/40 rounded-lg p-4 text-sm space-y-2 text-slate-400">
                  <p className="font-semibold text-white text-xs uppercase">How it works:</p>
                  <ul className="space-y-2 text-xs list-disc list-inside">
                    <li>Download Google Authenticator, Microsoft Authenticator, or Authy</li>
                    <li>Scan the QR code during MFA setup</li>
                    <li>You will need a 6-digit code from your app every time you log in</li>
                    <li>Keep your backup code in a safe place</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#050810]/80 backdrop-blur-xl border border-slate-800/50 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-10">
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[140px]">Severity</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[180px]">Source IP</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[250px]">Endpoint / Vector</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Metadata / User Agent</th>
                    <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[120px] text-right">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {loading ? (
                    <tr><td colSpan={5} className="p-32 text-center text-slate-600 font-mono text-sm tracking-tighter italic">Initializing Secure Connection...</td></tr>
                  ) : tab === 'events' ? (
                    events.map(ev => {
                      const meta = getRiskMeta(ev.risk_score);
                      return (
                        <tr key={ev.id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="p-5">
                            <div className={`inline-flex items-center px-3 py-1 rounded-lg border ${meta.bg} ${meta.border} ${meta.color} ${meta.glow} text-[9px] font-black`}>
                              {meta.label}
                            </div>
                          </td>
                          <td className="p-5 font-mono text-sm text-white font-medium">{ev.ip_address}</td>
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded ${['POST','DELETE','PUT'].includes(ev.method) ? 'bg-orange-500/10 text-orange-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                                {ev.method}
                              </span>
                              <span className="text-xs font-mono text-slate-400 truncate">{ev.path}</span>
                            </div>
                          </td>
                          <td className="p-5">
                            <p className="text-[11px] text-slate-500 font-medium truncate max-w-full italic" title={ev.user_agent}>
                              {ev.user_agent || 'Client identification withheld'}
                            </p>
                          </td>
                          <td className="p-5 text-right">
                            {!blocked.some(b => b.ip === ev.ip_address) ? (
                              <button
                                onClick={() => handleBlock(ev.ip_address)}
                                disabled={blockingIp === ev.ip_address}
                                className="opacity-0 group-hover:opacity-100 transition-all p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20"
                                title="Block IP"
                              >
                                <Lock size={16} />
                              </button>
                            ) : (
                              <div className="flex justify-end gap-1 text-emerald-500 opacity-60">
                                <ShieldCheck size={16} />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    blocked.map(b => (
                      <tr key={b.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-5"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" /></td>
                        <td className="p-5 font-mono text-sm text-red-400 font-black">{b.ip}</td>
                        <td className="p-5 text-xs text-slate-400">{b.reason}</td>
                        <td className="p-5 text-xs font-mono text-slate-500">{new Date(b.created_at).toLocaleString()}</td>
                        <td className="p-5 text-right">
                          <button
                            onClick={() => handleUnblock(b.ip)}
                            className="text-[10px] font-black text-emerald-400 hover:bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 transition-all uppercase tracking-widest"
                          >
                            Release
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!loading && (tab === 'events' ? events : blocked).length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <ShieldCheck size={48} className="text-emerald-500/20" />
                <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">No threats detected in local airspace</p>
              </div>
            )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}