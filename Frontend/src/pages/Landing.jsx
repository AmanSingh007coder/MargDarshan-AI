import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

// ── Animated counter ──────────────────────────────────────────────────────
function Counter({ target, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const seen = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || seen.current) return;
      seen.current = true;
      const end = parseFloat(target);
      const isFloat = String(target).includes('.');
      const dur = 1400, step = 16;
      let cur = 0;
      const t = setInterval(() => {
        cur = Math.min(cur + end / (dur / step), end);
        setCount(isFloat ? cur.toFixed(1) : Math.floor(cur));
        if (cur >= end) clearInterval(t);
      }, step);
    }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

// ── Scroll-reveal hook ────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis];
}

// ── Globe Canvas ──────────────────────────────────────────────────────────
function Globe() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, ctx;
    let frame;
    const T0 = performance.now();

    function resize() {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    // Major logistics nodes
    const NODES = [
      { lat: 18.96, lng: 72.82, c: '6,182,212', r: 3.5 }, // Mumbai
      { lat: 22.57, lng: 88.36, c: '6,182,212', r: 3 }, // Kolkata
      { lat: 13.08, lng: 80.27, c: '6,182,212', r: 3 }, // Chennai
      { lat: 9.93, lng: 76.26, c: '6,182,212', r: 2.5 }, // Kochi
      { lat: 28.61, lng: 77.20, c: '249,115,22', r: 3.5 }, // Delhi
      { lat: 1.35, lng: 103.82, c: '6,182,212', r: 3 }, // Singapore
      { lat: 25.20, lng: 55.27, c: '6,182,212', r: 3 }, // Dubai
      { lat: 51.50, lng: -0.12, c: '99,102,241', r: 2.5 }, // London
      { lat: 31.22, lng: 121.46, c: '6,182,212', r: 2.5 }, // Shanghai
      { lat: 22.30, lng: 114.17, c: '6,182,212', r: 2.5 }, // Hong Kong
    ];

    const ROUTES = [
      // Domestic (land) — orange
      { a: 0, b: 4, t: 'land', spd: 0.09 },  // Mumbai-Delhi
      { a: 0, b: 2, t: 'land', spd: 0.08 },  // Mumbai-Chennai
      { a: 2, b: 1, t: 'land', spd: 0.07 },  // Chennai-Kolkata
      { a: 4, b: 1, t: 'land', spd: 0.085 }, // Delhi-Kolkata
      { a: 2, b: 3, t: 'land', spd: 0.095 }, // Chennai-Kochi
      { a: 0, b: 3, t: 'land', spd: 0.075 }, // Mumbai-Kochi

      // Sea routes — cyan
      { a: 0, b: 6, t: 'sea', spd: 0.06 },  // Mumbai-Dubai
      { a: 6, b: 7, t: 'sea', spd: 0.05 },  // Dubai-London
      { a: 3, b: 5, t: 'sea', spd: 0.07 },  // Kochi-Singapore
      { a: 0, b: 5, t: 'sea', spd: 0.06 },  // Mumbai-Singapore
      { a: 2, b: 9, t: 'sea', spd: 0.055 },  // Chennai-HK
      { a: 5, b: 8, t: 'sea', spd: 0.065 },  // Singapore-Shanghai
      { a: 1, b: 5, t: 'sea', spd: 0.062 },  // Kolkata-Singapore
      { a: 0, b: 9, t: 'sea', spd: 0.058 },  // Mumbai-HK
      { a: 2, b: 6, t: 'sea', spd: 0.061 },  // Chennai-Dubai
      { a: 4, b: 6, t: 'sea', spd: 0.068 },  // Delhi-Dubai (via ports)
    ];

    // Pseudo-random stars
    const STARS = Array.from({ length: 180 }, (_, i) => ({
      x: ((i * 6571) % 997) / 997,
      y: ((i * 3947) % 883) / 883,
      r: 0.3 + ((i * 2311) % 100) / 100 * 1.1,
      a: 0.1 + ((i * 1733) % 100) / 100 * 0.5,
    }));

    function sph(lat, lng, R, rotDeg) {
      const phi = (90 - lat) * Math.PI / 180;
      const theta = (lng + rotDeg) * Math.PI / 180;
      return {
        x: R * Math.sin(phi) * Math.cos(theta),
        y: -R * Math.cos(phi),
        z: R * Math.sin(phi) * Math.sin(theta),
      };
    }

    function drawGrid(R, rot, cx, cy) {
      // Latitude rings — every 10°
      for (let lat = -80; lat <= 80; lat += 10) {
        const isMajor = lat % 30 === 0; // equator-ish lines slightly brighter
        let pd = false;
        ctx.beginPath();
        for (let lng = -180; lng <= 183; lng += 2) {
          const p = sph(lat, lng, R, rot);
          if (p.z <= 2) { pd = false; continue; }
          const x = cx + p.x, y = cy + p.y;
          if (!pd) { ctx.moveTo(x, y); pd = true; } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = isMajor ? 'rgba(6,182,212,0.22)' : 'rgba(6,182,212,0.13)';
        ctx.lineWidth = isMajor ? 0.7 : 0.45;
        ctx.stroke();
      }
      // Longitude meridians — every 10°
      for (let lng = -180; lng < 180; lng += 10) {
        const isMajor = lng % 30 === 0;
        let pd = false;
        ctx.beginPath();
        for (let lat = -90; lat <= 90; lat += 2) {
          const p = sph(lat, lng, R, rot);
          if (p.z <= 2) { pd = false; continue; }
          const x = cx + p.x, y = cy + p.y;
          if (!pd) { ctx.moveTo(x, y); pd = true; } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = isMajor ? 'rgba(6,182,212,0.18)' : 'rgba(6,182,212,0.09)';
        ctx.lineWidth = isMajor ? 0.7 : 0.45;
        ctx.stroke();
      }
    }

    function drawRoute(n1, n2, R, rot, cx, cy, type, progress) {
      const SEG = 100;
      const pts = [];
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const p = sph(n1.lat + (n2.lat - n1.lat) * t, n1.lng + (n2.lng - n1.lng) * t, R * 1.012, rot);
        pts.push({ x: cx + p.x, y: cy + p.y, z: p.z, t });
      }

      const isLand = type === 'land';
      const ci = isLand ? '249,115,22' : '6,182,212';

      // Full path (dim)
      ctx.beginPath();
      let pd = false;
      for (const p of pts) {
        if (p.z <= 0) { pd = false; continue; }
        if (!pd) { ctx.moveTo(p.x, p.y); pd = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = `rgba(${ci},0.18)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bright animated progress
      ctx.beginPath();
      pd = false;
      for (const p of pts) {
        if (p.t > progress) break;
        if (p.z <= 0) { pd = false; continue; }
        if (!pd) { ctx.moveTo(p.x, p.y); pd = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = `rgba(${ci},0.9)`;
      ctx.lineWidth = isLand ? 1.5 : 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgb(${ci})`;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Moving dot at tip
      const tip = pts[Math.min(Math.floor(progress * SEG), SEG)];
      if (tip && tip.z > 0) {
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${ci})`;
        ctx.shadowBlur = 18;
        ctx.shadowColor = `rgb(${ci})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    function render() {
      if (!ctx) return;
      const t = (performance.now() - T0) / 1000;
      const rot = t * 5.5; // 5.5°/s slow rotation
      const cx = W * 0.61;
      const cy = H * 0.5;
      const R = Math.min(W * 0.37, H * 0.45);

      ctx.clearRect(0, 0, W, H);

      // Stars
      STARS.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148,163,184,${s.a})`;
        ctx.fill();
      });

      // Outer atmosphere halo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.45);
      halo.addColorStop(0, 'rgba(6,182,212,0.0)');
      halo.addColorStop(0.3, 'rgba(6,182,212,0.12)');
      halo.addColorStop(0.7, 'rgba(6,182,212,0.05)');
      halo.addColorStop(1, 'rgba(2,6,23,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2); ctx.fill();

      // Globe fill (dark ocean)
      const fill = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
      fill.addColorStop(0, 'rgba(4,20,55,0.97)');
      fill.addColorStop(0.55, 'rgba(2,10,30,0.98)');
      fill.addColorStop(1, 'rgba(1,4,14,1)');
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Grid lines
      drawGrid(R, rot, cx, cy);

      // Routes
      ROUTES.forEach((route, i) => {
        const n1 = NODES[route.a], n2 = NODES[route.b];
        const progress = ((t * route.spd) + i * 0.31) % 1;
        drawRoute(n1, n2, R, rot, cx, cy, route.t, progress);
      });

      // Nodes
      NODES.forEach((node, i) => {
        const p = sph(node.lat, node.lng, R * 1.02, rot);
        if (p.z <= 0) return;
        const nx = cx + p.x, ny = cy + p.y;
        const pulse = (Math.sin(t * 2.2 + i * 1.1) + 1) / 2;

        ctx.beginPath();
        ctx.arc(nx, ny, 7 + pulse * 11, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${node.c},${0.18 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(nx, ny, node.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${node.c})`;
        ctx.shadowBlur = 14;
        ctx.shadowColor = `rgb(${node.c})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Globe rim stroke
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      rim.addColorStop(0, 'rgba(6,182,212,0.7)');
      rim.addColorStop(0.35, 'rgba(6,182,212,0.35)');
      rim.addColorStop(0.7, 'rgba(6,182,212,0.1)');
      rim.addColorStop(1, 'rgba(6,182,212,0.05)');
      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Primary specular highlight (top-left, bright)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.94, -Math.PI * 0.92, -Math.PI * 0.15);
      const spec1 = ctx.createLinearGradient(cx - R * 0.8, cy - R * 0.8, cx - R * 0.1, cy - R * 0.2);
      spec1.addColorStop(0, 'rgba(180,245,255,0.85)');
      spec1.addColorStop(0.5, 'rgba(150,230,245,0.55)');
      spec1.addColorStop(1, 'rgba(6,182,212,0)');
      ctx.strokeStyle = spec1;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();

      // Secondary shine (top area, softer glow)
      const shine = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.6, R * 0.08, cx - R * 0.45, cy - R * 0.6, R * 0.35);
      shine.addColorStop(0, 'rgba(200,248,255,0.25)');
      shine.addColorStop(0.6, 'rgba(6,182,212,0.08)');
      shine.addColorStop(1, 'rgba(6,182,212,0)');
      ctx.fillStyle = shine;
      ctx.beginPath();
      ctx.arc(cx - R * 0.45, cy - R * 0.6, R * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Right-side subtle shine
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.97, -Math.PI * 0.1, Math.PI * 0.15);
      const spec2 = ctx.createLinearGradient(cx + R * 0.7, cy - R * 0.4, cx + R * 0.2, cy);
      spec2.addColorStop(0, 'rgba(6,182,212,0.25)');
      spec2.addColorStop(1, 'rgba(6,182,212,0)');
      ctx.strokeStyle = spec2;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      frame = requestAnimationFrame(render);
    }

    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

// ── Glassmorphism KPI Card ────────────────────────────────────────────────
function GlassCard({ style, children }) {
  return (
    <div style={{
      background: 'rgba(2, 6, 23, 0.55)',
      backdropFilter: 'blur(24px) saturate(160%)',
      WebkitBackdropFilter: 'blur(24px) saturate(160%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [probRef, probVis] = useReveal();
  const [howRef, howVis] = useReveal();
  const [featRef, featVis] = useReveal();

  return (
    <div style={{ background: '#020617', color: '#e2e8f0', fontFamily: "'Manrope', sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:none} }
        @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.4);opacity:0} }
        .sr { opacity:0; transform:translateY(20px); transition:opacity .6s ease, transform .6s ease; }
        .sr.in { opacity:1; transform:none; }
        .glass-btn {
          background: rgba(6,182,212,0.12);
          border: 1px solid rgba(6,182,212,0.35);
          color: #06b6d4;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 12px;
          font-family: inherit;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.02em;
          cursor: pointer;
          padding: 11px 24px;
          transition: background .2s, border-color .2s, box-shadow .2s;
        }
        .glass-btn:hover {
          background: rgba(6,182,212,0.22);
          border-color: rgba(6,182,212,0.6);
          box-shadow: 0 0 20px rgba(6,182,212,0.2);
        }
        .glass-btn-ghost {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.15);
          color: #e2e8f0;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 12px;
          font-family: inherit;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          padding: 11px 24px;
          transition: background .2s, border-color .2s;
        }
        .glass-btn-ghost:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.3);
        }
        .cta-solid {
          background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: inherit;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.01em;
          cursor: pointer;
          padding: 14px 28px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 0 30px rgba(6,182,212,0.3), 0 4px 16px rgba(0,0,0,0.4);
          transition: box-shadow .2s, transform .15s;
        }
        .cta-solid:hover {
          box-shadow: 0 0 45px rgba(6,182,212,0.5), 0 4px 20px rgba(0,0,0,0.5);
          transform: translateY(-1px);
        }
        .step-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 28px;
          transition: border-color .3s, transform .3s, background .3s;
        }
        .step-card:hover { border-color: rgba(6,182,212,0.3); background: rgba(6,182,212,0.04); transform: translateY(-3px); }
        .feat-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 18px;
          padding: 28px 24px;
          position: relative;
          overflow: hidden;
          transition: border-color .3s, transform .3s;
        }
        .feat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 80% 0, rgba(6,182,212,0.06) 0%, transparent 60%);
          opacity: 0;
          transition: opacity .3s;
        }
        .feat-card:hover { border-color: rgba(6,182,212,0.25); transform: translateY(-3px); }
        .feat-card:hover::before { opacity: 1; }
      `}</style>

      {/* ── NAVBAR ────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(2,6,23,0.75)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 52px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '48px' }}>
          <img
            src="/logo.svg"
            alt="MargDarshan"
            style={{ height: '56px', objectFit: 'contain', width: 'auto', filter: 'drop-shadow(0 0 12px rgba(6,182,212,0.5))', transition: 'filter 0.3s ease' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['Problem', 'How it works', 'Features'].map(l => (
            <button key={l}
              onClick={() => document.getElementById(l.toLowerCase().replace(/ /g, ''))?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '6px 14px', borderRadius: '8px', fontFamily: 'inherit', transition: 'color .2s, background .2s' }}
              onMouseEnter={e => { e.target.style.color = '#f1f5f9'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.target.style.color = '#94a3b8'; e.target.style.background = 'none'; }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="glass-btn-ghost" style={{ fontSize: '13px', padding: '9px 20px' }} onClick={() => navigate('/login')}>Login</button>
          <button className="cta-solid" style={{ fontSize: '13px', padding: '9px 20px' }} onClick={() => navigate('/register')}>Get Started →</button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {/* Globe canvas behind everything */}
        <Globe />

        {/* Gradient mask — left side for text legibility */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #020617 32%, rgba(2,6,23,0.82) 50%, rgba(2,6,23,0.25) 68%, transparent 80%)', pointerEvents: 'none' }} />
        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%', background: 'linear-gradient(to top, #020617, transparent)', pointerEvents: 'none' }} />

        {/* Hero copy */}
        <div style={{ position: 'relative', zIndex: 2, padding: '110px 80px 80px', maxWidth: '580px' }}>

          {/* Live badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.22)', borderRadius: '999px', padding: '5px 16px', marginBottom: '40px', animation: 'fadeUp .5s ease forwards' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'blink 1.6s ease-in-out infinite', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ color: '#67e8f9', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em' }}>LIVE · monitoring 14 corridors across Bharat</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(44px, 5.5vw, 76px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.03em', animation: 'fadeUp .6s .08s ease both', color: '#f1f5f9' }}>
            Your supply chain<br />
            doesn't just move.<br />
            <span style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #67e8f9 60%, #a5f3fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              It thinks.
            </span>
          </h1>

          <p style={{ marginTop: '28px', fontSize: '16px', lineHeight: 1.75, color: '#64748b', maxWidth: '460px', animation: 'fadeUp .6s .2s ease both' }}>
            AI-powered disruption prediction and autonomous rerouting for Indian logistics corridors. Landslides, protests, monsoon — we see them before your trucks do.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '44px', animation: 'fadeUp .6s .32s ease both', flexWrap: 'wrap' }}>
            <button className="cta-solid" onClick={() => navigate('/register')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              Deploy Now
            </button>
            <button className="glass-btn-ghost" onClick={() => navigate('/login')}>
              View Live Map
            </button>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'flex', gap: '44px', marginTop: '60px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.06)', animation: 'fadeUp .6s .44s ease both' }}>
            {[
              { v: '3', s: 's', p: '< ', l: 'Alert latency' },
              { v: '96.4', s: '%', p: '', l: 'Model precision' },
              { v: '14', s: '×', p: '', l: 'Faster rerouting' },
            ].map(({ v, s, p, l }) => (
              <div key={l}>
                <p style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#f1f5f9', lineHeight: 1 }}>
                  <Counter target={v} suffix={s} prefix={p} />
                </p>
                <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginTop: '6px', fontWeight: 600 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Floating glassmorphism KPI cards ── */}
        <GlassCard style={{ position: 'absolute', zIndex: 3, top: '18%', right: '13%', padding: '18px 22px', minWidth: '175px' }}>
          <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Active Corridors</p>
          <p style={{ color: '#06b6d4', fontSize: '36px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>14</p>
          <p style={{ color: '#334155', fontSize: '11px', marginTop: '6px', fontWeight: 500 }}>across Bharat network</p>
          <div style={{ marginTop: '12px', display: 'flex', gap: '4px' }}>
            {[80, 60, 90, 45, 75, 55, 85].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h * 0.28}px`, background: `rgba(6,182,212,${0.3 + h / 200})`, borderRadius: '2px', alignSelf: 'flex-end' }} />
            ))}
          </div>
        </GlassCard>

        <GlassCard style={{ position: 'absolute', zIndex: 3, top: '45%', right: '5%', padding: '18px 22px', minWidth: '165px', borderColor: 'rgba(249,115,22,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Risk Alert</p>
            <span style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(249,115,22,0.3)', letterSpacing: '0.06em' }}>LIVE</span>
          </div>
          <p style={{ color: '#f97316', fontSize: '34px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>87%</p>
          <p style={{ color: '#334155', fontSize: '11px', marginTop: '6px', fontWeight: 500 }}>NH48 Lonavala segment</p>
          <div style={{ marginTop: '10px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
            <div style={{ width: '87%', height: '100%', background: 'linear-gradient(90deg,#f97316,#ef4444)', borderRadius: '2px', boxShadow: '0 0 8px rgba(249,115,22,0.5)' }} />
          </div>
        </GlassCard>

        <GlassCard style={{ position: 'absolute', zIndex: 3, top: '70%', right: '18%', padding: '16px 20px', minWidth: '150px' }}>
          <p style={{ color: '#475569', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>Ships Tracked</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
            <p style={{ color: '#67e8f9', fontSize: '30px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>09</p>
            <p style={{ color: '#10b981', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>↑ +2</p>
          </div>
          <p style={{ color: '#334155', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>sea routes · live</p>
        </GlassCard>
      </section>

      {/* ── PROBLEM ──────────────────────────────────── */}
      <section id="problem" style={{ padding: '110px 80px' }}>
        <div ref={probRef} className={`sr${probVis ? ' in' : ''}`}>
          <p style={{ color: '#06b6d4', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '20px' }}>01 — The Problem</p>
          <h2 style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-0.03em', marginBottom: '56px' }}>
            Reactive logistics<br />
            <span style={{ color: '#334155' }}>is a broken machine.</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
            {[
              { icon: '₹', stat: '₹1.2L Cr', desc: 'lost annually to supply chain disruptions in India' },
              { icon: '⏱', stat: '43%', desc: 'of delays are predictable with available realtime data' },
              { icon: '🌧', stat: '200+', desc: 'landslide events per monsoon in the Western Ghats alone' },
            ].map(({ icon, stat, desc }) => (
              <div key={stat} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '32px 28px' }}>
                <div style={{ fontSize: '22px', marginBottom: '16px', color: '#06b6d4' }}>{icon}</div>
                <p style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.04em', color: '#f1f5f9', marginBottom: '10px' }}>{stat}</p>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────── */}
      <section id="howitworks" style={{ padding: '110px 80px', background: 'rgba(255,255,255,0.012)' }}>
        <div ref={howRef} className={`sr${howVis ? ' in' : ''}`}>
          <p style={{ color: '#06b6d4', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '20px' }}>02 — How it works</p>
          <h2 style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-0.03em', marginBottom: '64px' }}>
            Four steps from<br />
            <span style={{ color: '#06b6d4' }}>shipment</span>{' '}
            <span style={{ color: '#334155' }}>to safety</span>
            <span style={{ color: '#f97316' }}>.</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '18px' }}>
            {[
              { num: '1', title: 'Register your fleet', desc: 'Onboard trucks, ships, and cargo in minutes.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8l5 2v4h-5" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg> },
              { num: '2', title: 'Define your routes', desc: 'Origin to destination — we generate the corridor.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6l9-3 9 3v7c0 5-9 9-9 9s-9-4-9-9V6z" /></svg> },
              { num: '3', title: 'AI scores risk live', desc: 'Weather, terrain, unrest — fused every 5 seconds.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg> },
              { num: '4', title: 'Reroute automatically', desc: 'Above 80% risk, the safer path takes over instantly.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg> },
            ].map(({ num, title, desc, icon }, i) => (
              <div key={num} className="step-card" style={{ transitionDelay: `${i * 0.07}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ width: '50px', height: '50px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                  </div>
                  <span style={{ width: '26px', height: '26px', background: '#f97316', color: '#020617', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900 }}>{num}</span>
                </div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>{title}</p>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES / STACK ────────────────────────── */}
      <section id="features" style={{ padding: '110px 80px' }}>
        <div ref={featRef} className={`sr${featVis ? ' in' : ''}`}>
          <p style={{ color: '#06b6d4', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '20px' }}>03 — The Stack</p>
          <h2 style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-0.03em', marginBottom: '56px' }}>
            Built like a<br />
            <span style={{ color: '#334155' }}>command center.</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            {[
              { n: '01', t: 'Risk Intelligence', d: 'XGBoost scores every lat/long 0–100% using a multi-modal feature stack.' },
              { n: '02', t: 'Live Rerouting', d: 'Dijkstra-based path optimization kicks in the moment risk crosses 80%.' },
              { n: '03', t: 'Multi-Signal Fusion', d: 'Weather + landslide + unrest data fused into a single risk score.' },
              { n: '04', t: 'Sea-Route Optimizer', d: 'Open-Meteo Marine API selects lowest wave/swell path automatically.' },
              { n: '05', t: 'Instant Alerts', d: 'Email, SMS, and in-app pings the moment a shipment nears danger.' },
              { n: '06', t: 'AI Co-Pilot', d: 'Ask anything in plain language — "which ships are at risk tonight?"' },
            ].map(({ n, t, d }) => (
              <div key={n} className="feat-card">
                <span style={{ position: 'absolute', top: '18px', right: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.1)', fontWeight: 600, letterSpacing: '0.06em' }}>{n}</span>
                <div style={{ width: '40px', height: '40px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '10px', marginBottom: '16px' }} />
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>{t}</p>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.65 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────── */}
      <section style={{ padding: '120px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <p style={{ color: '#06b6d4', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '24px', position: 'relative' }}>
          Ready to ship smarter?
        </p>
        <h2 style={{ fontSize: 'clamp(30px, 4vw, 52px)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-0.03em', marginBottom: '36px', position: 'relative' }}>
          Join the fleets that don't react.<br />
          <span style={{ color: '#334155' }}>They predict.</span>
        </h2>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', position: 'relative' }}>
          <button className="cta-solid" onClick={() => navigate('/register')}>Start free trial →</button>
          <button className="glass-btn-ghost" onClick={() => navigate('/login')}>Login to dashboard</button>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '52px 80px 36px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '48px', marginBottom: '48px' }}>
          <div>
            <img
              src="/logo.svg"
              alt="MargDarshan"
              style={{ height: '60px', objectFit: 'contain', marginBottom: '14px', width: 'auto', filter: 'drop-shadow(0 0 15px rgba(6,182,212,0.4))', transition: 'filter 0.3s ease' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7, maxWidth: '210px' }}>The self-healing supply chain for Bharat. Predicting disruptions before they disrupt.</p>
            <p style={{ fontSize: '12px', color: '#1e293b', marginTop: '14px' }}>Built for Bharat 🇮🇳</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1e293b', fontWeight: 700, marginBottom: '18px' }}>Product</p>
            {['Features', 'How it works', 'Live Demo'].map(l => (
              <p key={l} style={{ fontSize: '14px', color: '#475569', marginBottom: '10px', cursor: 'pointer', transition: 'color .2s' }} onMouseEnter={e => e.target.style.color = '#f1f5f9'} onMouseLeave={e => e.target.style.color = '#475569'}>{l}</p>
            ))}
          </div>
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1e293b', fontWeight: 700, marginBottom: '18px' }}>Company</p>
            {['About', 'Contact', 'Careers'].map(l => (
              <p key={l} style={{ fontSize: '14px', color: '#475569', marginBottom: '10px', cursor: 'pointer', transition: 'color .2s' }} onMouseEnter={e => e.target.style.color = '#f1f5f9'} onMouseLeave={e => e.target.style.color = '#475569'}>{l}</p>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', color: '#1e293b' }}>© 2026 MargDarshan-AI · All rights reserved</p>
          <p style={{ fontSize: '11px', color: '#1e293b', fontFamily: 'monospace' }}>Hackathon prototype · v0.1</p>
        </div>
      </footer>
    </div>
  );
}
