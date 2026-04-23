import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Copy, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function MfaEnroll() {
  const navigate = useNavigate();
  const enrolledRef = useRef(false);
  const [step, setStep] = useState('loading');
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    async function checkAndEnroll() {
      if (enrolledRef.current) return;
      enrolledRef.current = true;

      try {
        const { data: { factors } } = await supabase.auth.mfa.listFactors();
        const verified = factors?.totp?.find(f => f.status === 'verified');

        if (verified) {
          setStep('already');
          return;
        }

        const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          issuer: 'Margदर्शन',
          friendlyName: 'Margदर्शन Account'
        });

        if (enrollErr) {
          setError(enrollErr.message);
          setStep('error');
          return;
        }

        setQrUrl(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep('enroll');
      } catch (err) {
        setError(err.message || 'Failed to initialize MFA enrollment');
        setStep('error');
      }
    }

    checkAndEnroll();
  }, []);

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) throw challengeErr;

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });

      if (verifyErr) {
        setError('Invalid code. The code must be exactly 6 digits. Please try again.');
        setCode('');
        return;
      }

      setCodeSent(true);
      setStep('done');

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 size={40} className="text-cyan-400 animate-spin mx-auto" />
          <p className="text-slate-400">Initializing MFA setup...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#050810] border border-red-500/20 p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-red-400" />
            <h2 className="text-xl font-black text-white uppercase">Error</h2>
          </div>
          <p className="text-slate-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-cyan-500 text-black py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-cyan-400 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (step === 'already') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#050810] border border-white/5 p-8 rounded-2xl shadow-2xl text-center space-y-6">
          <CheckCircle size={56} className="text-emerald-400 mx-auto" />
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">MFA Already Active</h2>
            <p className="text-slate-500 text-sm mt-2">Your account is already protected with an authenticator app.</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-cyan-500 text-black py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-cyan-400 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 animate-in fade-in">
        <div className="max-w-md w-full bg-[#050810] border border-white/5 p-8 rounded-2xl shadow-2xl text-center space-y-6">
          <CheckCircle size={56} className="text-emerald-400 mx-auto animate-bounce" />
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">MFA Enabled</h2>
            <p className="text-slate-500 text-sm mt-2">Your account is now protected with two-factor authentication. You will be redirected to the dashboard shortly.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <p className="text-xs text-slate-400">Each login now requires a 6-digit code from your authenticator app.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#050810] border border-white/5 rounded-2xl shadow-2xl overflow-hidden">

        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-white/5 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <Shield size={24} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">Enable MFA</h1>
              <p className="text-slate-500 text-xs mt-0.5">Step {step === 'enroll' ? '1' : '2'} of 2</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {step === 'enroll' && (
            <div className="space-y-6 animate-in fade-in">
              <p className="text-slate-400 text-sm">Scan this QR code in Google Authenticator or your preferred authenticator app.</p>

              <div className="bg-white p-4 rounded-2xl w-fit mx-auto shadow-lg">
                <img src={qrUrl} alt="MFA QR Code" className="w-56 h-56" />
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-3">Manual Entry Key (if QR code doesn't work)</p>
                <div className="bg-[#020617] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                  <code className="text-cyan-400 font-mono text-sm break-all flex-1 select-all">{secret}</code>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="text-slate-500 hover:text-white transition shrink-0 p-2 hover:bg-white/5 rounded-lg"
                  >
                    {copied ? <CheckCircle size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm text-yellow-400 space-y-2">
                <p className="font-semibold">Important:</p>
                <ul className="text-xs space-y-1 text-yellow-300 list-disc list-inside">
                  <li>Save this key in a secure location</li>
                  <li>Never share this QR code or key</li>
                  <li>You will need this if you get a new phone</li>
                </ul>
              </div>

              <button
                onClick={() => setStep('verify')}
                className="w-full bg-cyan-500 text-black py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-cyan-400 transition"
              >
                I've Scanned the QR Code
              </button>
            </div>
          )}

          {step === 'verify' && (
            <form onSubmit={verifyCode} className="space-y-5 animate-in fade-in">
              <p className="text-slate-400 text-sm">Enter the 6-digit code shown in your authenticator app to confirm MFA setup.</p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white text-center text-3xl font-mono tracking-[0.2em] focus:border-cyan-500 outline-none transition"
                autoFocus
              />

              <p className="text-xs text-slate-500 text-center">Code updates every 30 seconds</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={code.length !== 6 || codeSent}
                className="w-full bg-cyan-500 text-black py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-cyan-400 transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {codeSent ? (
                  <><CheckCircle size={16} /> Verified!</>
                ) : (
                  'Verify and Activate'
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
