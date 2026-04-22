import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function TotpChallenge() {
  const navigate = useNavigate();
  const [factorId, setFactor] = useState('');
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Find the verified TOTP factor for this user
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const factor = data?.totp?.find(f => f.status === 'verified');
      if (factor) setFactor(factor.id);
    });
  }, []);

  const verify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;

      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) throw new Error('Invalid code. Please try again.');

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-[#050810] border border-white/5 p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 bg-cyan-500/10 rounded-2xl">
            <ShieldCheck size={32} className="text-cyan-400" />
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Two-Factor Auth</h1>
          <p className="text-slate-500 text-sm">Enter the 6-digit code from your authenticator app.</p>
        </div>

        <form onSubmit={verify} className="space-y-5">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white text-center text-2xl font-mono tracking-[0.5em] focus:border-cyan-500 outline-none transition"
            autoFocus
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-cyan-500 text-black py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-cyan-400 transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
              : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}
