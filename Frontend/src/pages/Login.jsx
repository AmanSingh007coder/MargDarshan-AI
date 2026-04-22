import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Check if MFA is required (AAL2 needed but only AAL1 achieved)
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    setLoading(false);

    if (
      aalData?.nextLevel === 'aal2' &&
      aalData?.currentLevel !== 'aal2'
    ) {
      // User has MFA enrolled — must pass the TOTP challenge
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

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition placeholder-slate-600"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition placeholder-slate-600"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
              : 'Enter Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
