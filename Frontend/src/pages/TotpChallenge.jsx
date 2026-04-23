import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function TotpChallenge() {
  const navigate = useNavigate();
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 5;

  useEffect(() => {
    async function findFactor() {
      try {
        const { data, error: err } = await supabase.auth.mfa.listFactors();
        if (err) throw err;

        const factor = data?.totp?.find(f => f.status === 'verified');
        if (factor) {
          setFactorId(factor.id);
        } else {
          setError('No verified authenticator found. Please set up MFA first.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load MFA settings');
      }
    }

    findFactor();
  }, []);

  const verify = async (e) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    if (attempts >= maxAttempts) {
      setError(`Maximum attempts exceeded. Please try logging in again.`);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      return;
    }

    setLoading(true);

    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) throw challengeErr;

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });

      if (verifyErr) {
        setAttempts(prev => prev + 1);
        setError(`Invalid code. (${attempts + 1}/${maxAttempts} attempts)`);
        setCode('');
        setLoading(false);
        return;
      }

      // Verify AAL2 is now set
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === 'aal2') {
        navigate('/dashboard');
      } else {
        setError('MFA verification failed. Please try again.');
        setCode('');
      }
    } catch (err) {
      setAttempts(prev => prev + 1);
      setError(err.message || 'Verification failed. Please try again.');
      setCode('');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-[#050810] border border-white/5 rounded-2xl shadow-2xl overflow-hidden">

        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-white/5 p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-4 bg-cyan-500/20 rounded-2xl">
              <ShieldCheck size={32} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">Two-Factor Authentication</h1>
              <p className="text-slate-500 text-xs mt-0.5">Verify your identity</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={verify} className="space-y-5">
            <p className="text-slate-400 text-sm text-center">
              Enter the 6-digit code from your authenticator app to complete login.
            </p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              disabled={attempts >= maxAttempts}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white text-center text-3xl font-mono tracking-[0.2em] focus:border-cyan-500 outline-none transition disabled:opacity-50"
              autoFocus
            />

            <p className="text-xs text-slate-500 text-center">Code updates every 30 seconds</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-3">
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {attempts > 0 && attempts < maxAttempts && (
              <p className="text-xs text-slate-400 text-center">
                {maxAttempts - attempts} attempt{maxAttempts - attempts !== 1 ? 's' : ''} remaining
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6 || attempts >= maxAttempts}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                : 'Verify Code'
              }
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-slate-500">
              Don't have your authenticator app?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                Go back to login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
