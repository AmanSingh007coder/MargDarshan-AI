import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { sendMessage } from '../utils/groq';
import { supabase } from '../utils/supabase';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [shipmentContext, setShipmentContext] = useState(null);
  const messagesEndRef = useRef(null);
  const [showWelcome, setShowWelcome] = useState(true);

  const suggestedActions = [
    "How many shipments do we have?",
    "What is a HIGH risk score?",
    "What corridors are monitored?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch shipments when chat opens
  useEffect(() => {
    if (open && !shipmentContext) {
      fetchShipments();
    }
  }, [open]);

  const fetchShipments = async () => {
    try {
      const [{ count }, { data, error }] = await Promise.all([
        supabase.from('shipments').select('*', { count: 'exact', head: true }),
        supabase
          .from('shipments')
          .select('display_id, type, vehicle_type, source, destination, status, created_at, route_meta')
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

      if (error || !data) return;

      const getName = (loc) => {
        if (!loc) return 'N/A';
        if (typeof loc === 'string') return loc;
        return loc.name || loc.city || 'N/A';
      };

      const fmt = (dt) => dt
        ? new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

      const haversineKm = (lat1, lng1, lat2, lng2) => {
        const R = 6371, d2r = Math.PI / 180;
        const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      const AVG_LAND_SPEED = 57;

      const getProgress = (s) => {
        if (s.status !== 'in_transit') return null;
        const elapsedHrs = (Date.now() - new Date(s.created_at).getTime()) / 3_600_000;

        let totalKm, totalHrs;
        if (s.route_meta?.distance_km && s.route_meta?.eta_hours) {
          totalKm = s.route_meta.distance_km;
          totalHrs = s.route_meta.eta_hours;
        } else if (s.source?.lat && s.destination?.lat) {
          totalKm = haversineKm(s.source.lat, s.source.lng, s.destination.lat, s.destination.lng);
          totalHrs = totalKm / AVG_LAND_SPEED;
        } else {
          return null;
        }

        const pct = Math.min(elapsedHrs / totalHrs, 1.0);
        const coveredKm = Math.round(pct * totalKm);
        const remainingKm = Math.round(totalKm - coveredKm);
        const etaLeft = Math.max(0, totalHrs - elapsedHrs);
        const etaStr = etaLeft < 1
          ? `${Math.round(etaLeft * 60)}min`
          : `${etaLeft.toFixed(1)}h`;

        return `${Math.round(pct * 100)}% done | ${coveredKm}km covered / ${remainingKm}km remaining | ETA: ${etaStr}`;
      };

      const byStatus = data.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {});
      const byType = data.reduce((acc, s) => { acc[s.type] = (acc[s.type] || 0) + 1; return acc; }, {});

      const recentList = data.map(s => {
        const progress = getProgress(s);
        const progressStr = progress ? ` | ${progress}` : '';
        return `- ${s.display_id}: ${getName(s.source)} → ${getName(s.destination)} | ${s.type} (${s.vehicle_type || 'N/A'}) | ${s.status} | ${fmt(s.created_at)}${progressStr}`;
      }).join('\n');

      const summary = [
        `Total shipments in database: ${count ?? data.length}`,
        `Status: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', ')}`,
        `Types: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(', ')}`,
        `Recent ${data.length} shipments:\n${recentList}`,
      ].join('\n');

      setShipmentContext(summary);
    } catch (err) {
      console.error('Failed to fetch shipments for context:', err);
    }
  };

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    setShowWelcome(false);
    const userMessage = { role: 'user', parts: [{ text }] };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const aiResponse = await sendMessage(updatedMessages, shipmentContext);
      const aiMessage = { role: 'model', parts: [{ text: aiResponse }] };
      setMessages([...updatedMessages, aiMessage]);
    } catch (error) {
      const errorMessage = { role: 'model', parts: [{ text: error.message }] };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[10000] w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-white"
        title="Chat with Margदर्शन AI"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[9999] w-[380px] h-[520px] bg-[#050810] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-white/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <MessageCircle size={20} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">Margदर्शन AI</h3>
                <p className="text-xs text-slate-500">{shipmentContext ? 'Live data connected' : 'Logistics Assistant'}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-white/5 rounded-lg transition text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && showWelcome && (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-4">
                <div className="p-3 bg-cyan-500/10 rounded-full">
                  <MessageCircle size={32} className="text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-white font-black text-sm uppercase">Welcome!</h4>
                  <p className="text-xs text-slate-400 mt-1">Ask me about your shipments, risk scores, or supply chain optimization.</p>
                </div>
                <div className="w-full space-y-2">
                  {suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(action)}
                      className="w-full text-left text-xs p-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:border-cyan-500/50 transition"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[280px] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-cyan-500/20 border border-cyan-500/30 text-white'
                      : 'bg-white/5 border border-white/10 text-slate-300'
                  }`}
                >
                  {msg.parts[0].text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-lg flex items-center gap-2">
                  <Loader2 size={16} className="text-cyan-400 animate-spin" />
                  <span className="text-xs text-slate-400">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-white/5 p-4 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) handleSendMessage(input);
                }}
                placeholder="Ask anything..."
                disabled={loading}
                className="flex-1 bg-white/5 border border-white/10 p-2 rounded-lg text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition disabled:opacity-50"
              />
              <button
                onClick={() => handleSendMessage(input)}
                disabled={loading || !input.trim()}
                className="p-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 text-center">Powered by Groq · llama-3.1</p>
          </div>
        </div>
      )}
    </>
  );
}
