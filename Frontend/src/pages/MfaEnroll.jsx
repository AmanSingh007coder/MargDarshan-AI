import { useState, useEffect } from 'react';
import { Shield, Copy, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function MfaEnroll() {
  const [step, setStep]       = useState('loading'); // loading | enroll | verify | done | already
  const [qrUrl, setQrUrl]     = useState('');
  const [secret, setSecret]   = useState('');
  const [factorId, setFactor] = useState('');
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(false);

  // Check current AAL and existing factors
  useEffect(() => {
    async function check() {
      const { data: { factors } } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.find(f => f.status === 'verified');
      if (verified) { setStep('already'); return; }

      // Create a new enrollment
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (err) { setError(err.message); setStep('error'); return; }

      setQrUrl(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactor(data.id);
      setStep('enroll');
    }
    check();
  }, []);

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError('');
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) { setError(challenge.error.message); return; }

    const { error: verErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    });
    if (verErr) { setError('Invalid code. Try again.'); return; }

    setStep('done');
  };

  // ── States ──────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (step === 'already') {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16">
        <CheckCircle size={48} className="text-emerald-400 mx-auto" />
        <h2 className="text-xl font-black text-white uppercase tracking-tight">MFA Already Active</h2>
        <p className="text-slate-500 text-sm">Your account is protected with an authenticator app.</p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16 animate-in fade-in">
        <CheckCircle size={48} className="text-emerald-400 mx-auto" />
        <h2 className="text-xl font-black text-white uppercase tracking-tight">MFA Enabled</h2>
        <p className="text-slate-500 text-sm">Your account now requires a 6-digit code on login.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-cyan-500/10 rounded-xl">
          <Shield size={22} className="text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Enable Authenticator MFA</h1>
          <p className="text-slate-500 text-xs mt-0.5">Scan the QR code in Google Authenticator.</p>
        </div>
      </div>

      {step === 'enroll' && (
        <div className="space-y-6">
          {/* QR code */}
          <div className="bg-white p-4 rounded-2xl w-fit mx-auto">
            <img src={qrUrl} alt="MFA QR Code" className="w-44 h-44" />
          </div>

          {/* Manual secret */}
          <div className="bg-[#050810] border border-white/5 rounded-xl p-4 space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Manual entry key</p>
            <div className="flex items-center gap-3">
              <code className="text-cyan-400 font-mono text-sm break-all flex-1">{secret}</code>
              <button onClick={copySecret} className="text-slate-500 hover:text-white transition shrink-0">
                {copied ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <button
            onClick={() => setStep('verify')}
            className="w-full bg-cyan-500 text-black py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-cyan-400 transition"
          >
            I've scanned the QR code →
          </button>
        </div>
      )}

      {step === 'verify' && (
        <form onSubmit={verifyCode} className="space-y-5">
          <p className="text-slate-400 text-sm">Enter the 6-digit code from your authenticator app to confirm enrollment.</p>

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

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={code.length !== 6}
            className="w-full bg-cyan-500 text-black py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-cyan-400 transition disabled:opacity-40"
          >
            Verify &amp; Activate
          </button>
        </form>
      )}
    </div>
  );
}
