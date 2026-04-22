import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authErr) { setError(authErr.message); return; }

    // Check if TOTP MFA is enrolled — redirect to /mfa challenge if so
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
      navigate('/mfa');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#050810] border border-white/5 p-8 rounded-2xl shadow-2xl">

        <div className="flex items-center gap-3 mb-8">
          <div className="bg-cyan-500 p-2 rounded-lg">
            <Truck className="text-black" size={24} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">MargDarshan AI</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" placeholder="Email" value={email} required
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition placeholder-slate-600"
          />
          <input
            type="password" placeholder="Password" value={password} required
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition placeholder-slate-600"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Enter Dashboard'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          No account?{' '}
          <Link to="/register" className="text-cyan-400 hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
