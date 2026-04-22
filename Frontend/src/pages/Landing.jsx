import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

/* ─── tiny hook: fires once when element enters viewport ─── */
function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.15 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

/* ─── section label pill ─── */
function SectionTag({ number, label }) {
  return (
    <p style={{ color: '#22d3b8', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '20px' }}>
      {String(number).padStart(2, '0')} — {label}
    </p>
  )
}

/* ─── animated counter ─── */
function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0)
  const [ref, visible] = useReveal()
  useEffect(() => {
    if (!visible) return
    const end = parseFloat(target)
    const isDecimal = String(target).includes('.')
    const duration = 1400
    const step = 16
    const steps = duration / step
    let current = 0
    const inc = end / steps
    const t = setInterval(() => {
      current = Math.min(current + inc, end)
      setCount(isDecimal ? current.toFixed(1) : Math.floor(current))
      if (current >= end) clearInterval(t)
    }, step)
    return () => clearInterval(t)
  }, [visible, target])
  return <span ref={ref}>{count}{suffix}</span>
}

/* ─── blinking live dot ─── */
const LiveBadge = ({ label = 'LIVE · monitoring 14 corridors across Bharat' }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(34,211,184,0.08)', border: '1px solid rgba(34,211,184,0.25)', borderRadius: '999px', padding: '5px 14px', marginBottom: '36px' }}>
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22d3b8', display: 'inline-block', animation: 'blink 1.4s ease-in-out infinite' }} />
    <span style={{ color: '#22d3b8', fontSize: '12px', fontWeight: 500, letterSpacing: '0.03em' }}>{label}</span>
  </div>
)

export default function Landing() {
  const navigate = useNavigate()
  const [heroRef, heroVisible] = useReveal()
  const [problemRef, problemVisible] = useReveal()
  const [howRef, howVisible] = useReveal()
  const [stackRef, stackVisible] = useReveal()
  const [demoRef, demoVisible] = useReveal()

  return (
    <div style={{ background: '#0a0d12', color: '#e8eaed', fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,211,184,0.4)} 50%{box-shadow:0 0 0 8px rgba(34,211,184,0)} }
        .nav-link { color:#9ca3af; font-size:14px; font-weight:400; cursor:pointer; transition:color .2s; text-decoration:none; background:none; border:none; }
        .nav-link:hover { color:#fff; }
        .step-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:28px; transition:border-color .3s, background .3s; }
        .step-card:hover { border-color:rgba(34,211,184,0.3); background:rgba(34,211,184,0.04); }
        .feature-card { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:28px 24px; transition:border-color .3s, transform .3s; position:relative; overflow:hidden; }
        .feature-card:hover { border-color:rgba(34,211,184,0.25); transform:translateY(-3px); }
        .feature-num { position:absolute; top:16px; right:20px; font-size:11px; font-weight:500; color:rgba(255,255,255,0.12); letter-spacing:0.08em; }
        .stat-card { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:32px 28px; }
        .scroll-reveal { opacity:0; transform:translateY(24px); transition:opacity .65s ease, transform .65s ease; }
        .scroll-reveal.visible { opacity:1; transform:none; }
        .cta-primary { background:#22d3b8; color:#0a0d12; border:none; padding:13px 26px; border-radius:8px; font-size:15px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:background .2s, transform .15s; font-family:inherit; }
        .cta-primary:hover { background:#1bbca4; transform:translateY(-1px); }
        .cta-secondary { background:transparent; color:#e8eaed; border:1px solid rgba(255,255,255,0.18); padding:13px 26px; border-radius:8px; font-size:15px; font-weight:500; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:border-color .2s, background .2s; font-family:inherit; }
        .cta-secondary:hover { border-color:rgba(255,255,255,0.4); background:rgba(255,255,255,0.04); }
        .connector { position:absolute; top:42px; left:calc(100% + 0px); width:calc(100% - 0px); height:1px; background:linear-gradient(90deg,rgba(34,211,184,0.4),rgba(34,211,184,0.1)); }
        * { box-sizing:border-box; margin:0; padding:0; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', height: '68px', background: 'rgba(10,13,18,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg,#22d3b8,#0ea5e9)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: '16px', letterSpacing: '-0.01em' }}>MargDarshan<span style={{ color: '#22d3b8' }}>·</span>AI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {['Problem', 'How it works', 'Features', 'Demo'].map(l => (
            <button key={l} className="nav-link" onClick={() => document.getElementById(l.toLowerCase().replace(/ /g, '-'))?.scrollIntoView({ behavior: 'smooth' })}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="nav-link" onClick={() => navigate('/login')}>Login</button>
          <button className="cta-primary" style={{ padding: '9px 20px', fontSize: '14px' }} onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '120px 80px 80px' }}>
        <div ref={heroRef} style={{ maxWidth: '680px' }}>
          <div style={{ animation: heroVisible ? 'fadeUp .6s ease forwards' : 'none', opacity: 0 }}>
            <LiveBadge />
          </div>
          <h1 style={{ fontSize: 'clamp(52px, 7vw, 84px)', fontFamily: "'DM Serif Display', serif", fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.02em', animation: heroVisible ? 'fadeUp .7s .1s ease forwards' : 'none', opacity: 0 }}>
            Your supply chain<br />
            doesn't just move.<br />
            <span style={{ color: '#22d3b8', fontStyle: 'italic' }}>It thinks.</span>
            <span style={{ color: '#f59e0b' }}>·</span>
          </h1>
          <p style={{ marginTop: '28px', fontSize: '17px', lineHeight: 1.7, color: '#9ca3af', maxWidth: '480px', animation: heroVisible ? 'fadeUp .7s .25s ease forwards' : 'none', opacity: 0 }}>
            AI-powered disruption prediction and automatic rerouting for Indian logistics corridors. Landslides, protests, monsoon — we see them before your trucks do.
          </p>
          <div style={{ display: 'flex', gap: '14px', marginTop: '40px', animation: heroVisible ? 'fadeUp .7s .38s ease forwards' : 'none', opacity: 0 }}>
            <button className="cta-primary" onClick={() => navigate('/register')}>Start free trial →</button>
            <button className="cta-secondary" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" fill="none"/><polygon points="10,8 16,12 10,16"/></svg>
              Watch demo
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: '64px', marginTop: '80px', paddingTop: '48px', borderTop: '1px solid rgba(255,255,255,0.07)', animation: heroVisible ? 'fadeUp .7s .5s ease forwards' : 'none', opacity: 0 }}>
          {[
            { value: '3', suffix: 's', prefix: '< ', label: 'Alert latency' },
            { value: '96.4', suffix: '%', prefix: '', label: 'Model precision' },
            { value: '14', suffix: '×', prefix: '', label: 'Faster rerouting' },
          ].map(({ value, suffix, prefix, label }) => (
            <div key={label}>
              <p style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 600, letterSpacing: '-0.02em', color: '#fff' }}>
                {prefix}<Counter target={value} suffix={suffix} />
              </p>
              <p style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', marginTop: '4px', fontWeight: 500 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 01 THE PROBLEM ── */}
      <section id="problem" style={{ padding: '100px 80px' }}>
        <div ref={problemRef} className={`scroll-reveal${problemVisible ? ' visible' : ''}`}>
          <SectionTag number={1} label="The problem" />
          <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontFamily: "'DM Serif Display',serif", fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '56px' }}>
            Reactive logistics<br />
            <span style={{ color: '#6b7280' }}>is a broken machine.</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
            {[
              { icon: '₹', stat: '₹1.2L Cr', desc: 'lost annually to supply chain disruptions in India' },
              { icon: '⏱', stat: '43%', desc: 'of delays are predictable with available data' },
              { icon: '🌧', stat: '200+', desc: 'landslide events per monsoon in the Western Ghats alone' },
            ].map(({ icon, stat, desc }) => (
              <div key={stat} className="stat-card">
                <div style={{ fontSize: '22px', marginBottom: '16px', color: '#22d3b8' }}>{icon}</div>
                <p style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', marginBottom: '10px' }}>{stat}</p>
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 02 HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: '100px 80px', background: 'rgba(255,255,255,0.015)' }}>
        <div ref={howRef} className={`scroll-reveal${howVisible ? ' visible' : ''}`}>
          <SectionTag number={2} label="How it works" />
          <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontFamily: "'DM Serif Display',serif", fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '64px' }}>
            Four steps from<br />
            <span style={{ color: '#22d3b8' }}>shipment</span> <span style={{ color: '#9ca3af' }}>to</span> <span style={{ color: '#22d3b8' }}>safety</span><span style={{ color: '#f59e0b' }}>.</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px', position: 'relative' }}>
            {[
              { num: '1', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22d3b8" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8l5 2v4h-5"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>, title: 'Register your fleet', desc: 'Onboard trucks, drivers, and cargo in minutes.' },
              { num: '2', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22d3b8" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6l9-3 9 3v7c0 5-9 9-9 9s-9-4-9-9V6z"/></svg>, title: 'Define your routes', desc: 'Origin to destination — we generate the corridor.' },
              { num: '3', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22d3b8" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>, title: 'AI scores risk live', desc: 'Weather, terrain, unrest — fused every 5 seconds.' },
              { num: '4', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22d3b8" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>, title: 'Reroute automatically', desc: 'Above 80% risk, the safer path takes over.' },
            ].map(({ num, icon, title, desc }, i) => (
              <div key={num} className="step-card" style={{ transitionDelay: `${i * 0.08}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ width: '52px', height: '52px', background: 'rgba(34,211,184,0.08)', border: '1px solid rgba(34,211,184,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                  </div>
                  <span style={{ width: '24px', height: '24px', background: '#f59e0b', color: '#0a0d12', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{num}</span>
                </div>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>{title}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 03 THE STACK (Features) ── */}
      <section id="features" style={{ padding: '100px 80px' }}>
        <div ref={stackRef} className={`scroll-reveal${stackVisible ? ' visible' : ''}`}>
          <SectionTag number={3} label="The stack" />
          <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontFamily: "'DM Serif Display',serif", fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '56px' }}>
            Built like a<br />
            <span style={{ color: '#6b7280' }}>command center.</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '18px' }}>
            {[
              { num: '01', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3b8" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 8v4l3 3"/></svg>, title: 'Risk Intelligence', desc: 'XGBoost scores every lat/long 0–100% using a multi-modal feature stack.' },
              { num: '02', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3b8" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>, title: 'Live Rerouting', desc: 'Dijkstra-based path optimization kicks in the moment risk crosses 80%.' },
              { num: '03', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3b8" strokeWidth="1.8" strokeLinecap="round"><path d="M20 17.5c0 .8-.7 1.5-1.5 1.5h-13A1.5 1.5 0 014 17.5V6.5C4 5.7 4.7 5 5.5 5h13c.8 0 1.5.7 1.5 1.5v11z"/><path d="M8 12l2 2 4-4"/></svg>, title: 'Multi-Signal Fusion', desc: 'Weather + landslide history + unrest detection, fused into one score.' },
              { num: '04', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3b8" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, title: 'Fleet Dashboard', desc: 'Every truck, every corridor, every risk — one command center.' },
              { num: '05', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3b8" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>, title: 'Instant Alerts', desc: 'Email, SMS, and in-app pings the moment a truck nears danger.' },
              { num: '06', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3b8" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, title: 'AI Co-Pilot', desc: 'Ask anything — "which shipments are at risk tonight?" — in plain English.' },
            ].map(({ num, icon, title, desc }) => (
              <div key={num} className="feature-card">
                <span className="feature-num">{num}</span>
                <div style={{ marginBottom: '14px' }}>{icon}</div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>{title}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 04 DEMO ── */}
      <section id="demo" style={{ padding: '100px 80px', background: 'rgba(255,255,255,0.015)' }}>
        <div ref={demoRef} className={`scroll-reveal${demoVisible ? ' visible' : ''}`}>
          <SectionTag number={4} label="See it live" />
          <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontFamily: "'DM Serif Display',serif", fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '16px' }}>
            Lonavala Ghats, <span style={{ color: '#f59e0b' }}>July</span><br />
            <span style={{ color: '#f59e0b' }}>2024.</span>
            <br />
            <span style={{ color: '#6b7280' }}>Three trucks rerouted</span><br />
            <span style={{ color: '#6b7280' }}>in 4 seconds.</span>
          </h2>

          {/* Mock dashboard preview */}
          <div style={{ marginTop: '48px', background: '#0f1318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', overflow: 'hidden' }}>
            {/* Chrome bar */}
            <div style={{ background: '#161b22', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22d3b8', display: 'inline-block', animation: 'blink 1.4s infinite' }} />
                <span style={{ color: '#22d3b8', fontSize: '11px', letterSpacing: '0.1em', fontWeight: 600 }}>LIVE · NH48 CORRIDOR</span>
              </div>
            </div>
            {/* Fake dashboard body */}
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 220px', height: '340px' }}>
              {/* Sidebar */}
              <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', padding: '20px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg,#22d3b8,#0ea5e9)', borderRadius: '6px' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Dashook</span>
                </div>
                {['Overview','Live Route','Settings','Danger'].map((l, i) => (
                  <div key={l} style={{ padding: '8px 10px', borderRadius: '6px', marginBottom: '4px', background: i === 1 ? 'rgba(34,211,184,0.1)' : 'transparent', color: i === 1 ? '#22d3b8' : '#6b7280', fontSize: '12px', fontWeight: i === 1 ? 600 : 400 }}>{l}</div>
                ))}
              </div>
              {/* Map area */}
              <div style={{ position: 'relative', overflow: 'hidden', background: '#0d1117' }}>
                {/* Fake India SVG map silhouette */}
                <svg width="100%" height="100%" viewBox="0 0 400 340" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6"/>
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
                    </radialGradient>
                  </defs>
                  {/* simplified India shape */}
                  <path d="M160,40 L220,35 L270,50 L300,80 L310,120 L290,160 L300,200 L270,250 L240,280 L200,310 L170,280 L150,240 L130,200 L110,160 L120,120 L130,80 Z" fill="rgba(34,211,184,0.04)" stroke="rgba(34,211,184,0.15)" strokeWidth="1"/>
                  {/* Route line Mumbai-Pune */}
                  <path d="M155,220 L170,210 L180,200 L190,190 L195,180" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 3" opacity="0.9"/>
                  {/* Glow blobs (risk zones) */}
                  <ellipse cx="185" cy="195" rx="28" ry="20" fill="url(#glow1)" />
                  <ellipse cx="165" cy="218" rx="18" ry="14" fill="url(#glow2)" />
                  {/* Truck dots */}
                  <circle cx="155" cy="222" r="5" fill="#22d3b8" opacity="0.9">
                    <animate attributeName="r" values="5;8;5" dur="1.8s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.8s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="175" cy="207" r="5" fill="#ef4444" opacity="0.9">
                    <animate attributeName="r" values="5;8;5" dur="2.1s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2.1s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="192" cy="183" r="4" fill="#22c55e" opacity="0.9"/>
                  {/* Labels */}
                  <text x="135" y="232" fill="#6b7280" fontSize="8" fontFamily="monospace">Mumbai</text>
                  <text x="192" y="178" fill="#6b7280" fontSize="8" fontFamily="monospace">Pune</text>
                  <text x="165" y="196" fill="#ef4444" fontSize="8" fontFamily="monospace">RISK 87%</text>
                </svg>
              </div>
              {/* Right panel */}
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '20px 16px' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>The Status</p>
                {[
                  { label: 'MH-12-AB-1234', risk: 87, color: '#ef4444' },
                  { label: 'MH-04-CD-5678', risk: 34, color: '#22d3b8' },
                  { label: 'MH-09-EF-9012', risk: 15, color: '#22c55e' },
                ].map(({ label, risk, color }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '10px', fontFamily: 'monospace', color: '#9ca3af', marginBottom: '6px' }}>{label}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                        <div style={{ width: `${risk}%`, height: '100%', background: color, borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color }}>{risk}%</span>
                    </div>
                  </div>
                ))}
                {/* Donut chart placeholder */}
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
                    <circle cx="40" cy="40" r="30" fill="none" stroke="#f59e0b" strokeWidth="10" strokeDasharray="113 75" strokeLinecap="round" transform="rotate(-90 40 40)"/>
                    <circle cx="40" cy="40" r="30" fill="none" stroke="#22d3b8" strokeWidth="10" strokeDasharray="50 138" strokeDashoffset="-113" strokeLinecap="round" transform="rotate(-90 40 40)"/>
                    <text x="40" y="45" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">64%</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '120px 80px', textAlign: 'center' }}>
        <p style={{ color: '#22d3b8', fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '24px' }}>Ready to ship smarter?</p>
        <h2 style={{ fontSize: 'clamp(32px,4.5vw,52px)', fontFamily: "'DM Serif Display',serif", fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '32px' }}>
          Join the fleets that don't<br />
          <span style={{ color: '#6b7280' }}>react. They predict.</span>
        </h2>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
          <button className="cta-primary" onClick={() => navigate('/register')}>Start free trial →</button>
          <button className="cta-secondary" onClick={() => navigate('/login')}>Login to dashboard</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '56px 80px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '40px', marginBottom: '48px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg,#22d3b8,#0ea5e9)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>
              </div>
              <span style={{ fontWeight: 600, fontSize: '15px' }}>MargDarshan<span style={{ color: '#22d3b8' }}>·</span>AI</span>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.7, maxWidth: '220px' }}>The self-healing supply chain for Bharat. Predicting disruptions before they disrupt.</p>
            <p style={{ fontSize: '12px', color: '#4b5563', marginTop: '16px' }}>Built for Bharat 🇮🇳</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b5563', fontWeight: 600, marginBottom: '18px' }}>Product</p>
            {['Features', 'How it works', 'Demo'].map(l => <p key={l} style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px', cursor: 'pointer' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#6b7280'}>{l}</p>)}
          </div>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b5563', fontWeight: 600, marginBottom: '18px' }}>Company</p>
            {['About', 'Contact', 'Careers'].map(l => <p key={l} style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px', cursor: 'pointer' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#6b7280'}>{l}</p>)}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', color: '#4b5563' }}>© 2026 MargDarshan-AI · All rights reserved</p>
          <p style={{ fontSize: '11px', color: '#374151', fontFamily: 'monospace' }}>Hackathon prototype · v0.1</p>
        </div>
      </footer>
    </div>
  )
}