import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { sendMessage } from '../utils/gemini';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [showWelcome, setShowWelcome] = useState(true);

  const suggestedActions = [
    "What is a HIGH risk score?",
    "Explain how rerouting works",
    "What corridors are monitored?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    setShowWelcome(false);
    const userMessage = { role: 'user', parts: [{ text }] };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const aiResponse = await sendMessage(updatedMessages);
      const aiMessage = { role: 'model', parts: [{ text: aiResponse }] };
      setMessages([...updatedMessages, aiMessage]);
    } catch (error) {
      const errorMessage = { role: 'model', parts: [{ text: error.message }] };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedAction = (action) => {
    handleSendMessage(action);
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-white"
        title="Chat with MargDarshan AI"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[59] w-[380px] h-[520px] bg-[#050810] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-white/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <MessageCircle size={20} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">Margदर्शन AI</h3>
                <p className="text-xs text-slate-500">Logistics Assistant</p>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.length === 0 && showWelcome && (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-4">
                <div className="p-3 bg-cyan-500/10 rounded-full">
                  <MessageCircle size={32} className="text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-white font-black text-sm uppercase">Welcome!</h4>
                  <p className="text-xs text-slate-400 mt-1">Ask me about shipments, risk scores, or supply chain optimization.</p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
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

            {messages.length === 0 && showWelcome && (
              <div className="mt-4 space-y-2">
                {suggestedActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedAction(action)}
                    className="w-full text-left text-xs p-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:border-cyan-500/50 transition"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-white/5 p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleSendMessage(input);
                  }
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
            <p className="text-xs text-slate-500 text-center">Powered by Gemini 1.5 Flash</p>
          </div>
        </div>
      )}
    </>
  );
}
