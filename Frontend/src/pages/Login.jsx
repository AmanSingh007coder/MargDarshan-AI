import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) {
        setError(authErr.message);
        setLoading(false);
        return;
      }

      // Check MFA factors
      const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
      if (factorsErr) {
        setError('Failed to check security settings: ' + factorsErr.message);
        setLoading(false);
        return;
      }

      const anyTotp = factorsData?.totp?.length > 0;
      const verifiedFactor = factorsData?.totp?.find(f => f.status === 'verified');

      // If no MFA factor at all, force enrollment
      if (!anyTotp) {
        navigate('/mfa/enroll');
        return;
      }

      // If MFA factor exists (verified or not), require the challenge
      const { data: aalData, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalErr) {
        setError('Failed to check security settings: ' + aalErr.message);
        setLoading(false);
        return;
      }

      if (aalData?.nextLevel === 'aal2') {
        navigate('/mfa');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#050810] border border-white/5 p-8 rounded-2xl shadow-2xl">

        <div className="flex items-center gap-3 mb-8">
          <div className="bg-cyan-500 p-2 rounded-lg">
            <Truck className="text-black" size={24} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Margदर्शन AI</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              required
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Password</label>
            <input
              type="password"
              placeholder="Your secure password"
              value={password}
              required
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition placeholder-slate-600"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Enter Dashboard'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/5">
          <p className="text-center text-slate-500 text-sm">
            No account yet?{' '}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
