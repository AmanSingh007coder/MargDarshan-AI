import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#050810] border border-white/5 p-8 rounded-2xl shadow-2xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Truck className="text-emerald-400" size={28} />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Account Created</h2>
          <p className="text-slate-400 text-sm">
            Check your inbox — we sent a confirmation link to <span className="text-cyan-400">{email}</span>.
            Click it to activate your account, then log in.
          </p>
          <Link
            to="/login"
            className="block w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 rounded-xl transition text-sm uppercase tracking-widest"
          >
            Go to Login
          </Link>
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
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition placeholder-slate-600"
          />
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
            placeholder="Password (min 6 chars)"
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
              ? <><Loader2 size={16} className="animate-spin" /> Creating…</>
              : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
