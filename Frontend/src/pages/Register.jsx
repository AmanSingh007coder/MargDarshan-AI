import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (done && !redirecting) {
      const checkAuth = async () => {
        setRedirecting(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            const { data: { factors } } = await supabase.auth.mfa.listFactors();
            const verifiedMfa = factors?.totp?.find(f => f.status === 'verified');

            if (!verifiedMfa) {
              navigate('/mfa/enroll');
            } else {
              navigate('/dashboard');
            }
          }
        } catch (err) {
          console.error('Auth check failed:', err);
          navigate('/dashboard');
        }
      };

      const timer = setTimeout(checkAuth, 2000);
      return () => clearTimeout(timer);
    }
  }, [done, redirecting, navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        setDone(true);
      } else {
        setError('Account created but verification pending. Check your email.');
        setDone(true);
      }
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#050810] border border-white/5 p-8 rounded-2xl shadow-2xl text-center space-y-5 animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="text-emerald-400 animate-bounce" size={28} />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Welcome to Margदर्शन!</h2>
          <p className="text-slate-400 text-sm">
            Your account has been created successfully. Setting up your dashboard...
          </p>
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="text-cyan-400 animate-spin" />
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Redirecting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#050810] border border-white/5 p-8 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-cyan-500 p-2 rounded-lg">
            <Truck className="text-black" size={24} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Create Account</h1>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Full Name</label>
            <input
              type="text"
              placeholder="Your full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Password</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
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
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Creating account...</>
              : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/5">
          <p className="text-center text-slate-500 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
