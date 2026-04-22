const supabase = require('../utils/supabaseClient');

// Paths that real apps don't expose — any hit is an attacker probe
const HONEYPOT_PATHS = [
  '/admin', '/wp-admin', '/wp-login.php', '/wordpress',
  '/.env', '/.git', '/.git/config', '/config.php', '/configuration.php',
  '/phpmyadmin', '/pma', '/mysqladmin',
  '/debug', '/backup', '/dump', '/sql',
  '/etc/passwd', '/proc/self',
  '/api/v1/users/admin', '/api/admin',
  '/shell', '/cmd', '/exec',
  '/login.php', '/admin.php', '/panel',
  '/actuator', '/actuator/env', '/actuator/health',
  '/.well-known/security.txt',
  '/xmlrpc.php', '/XMLRPC',
  '/cgi-bin/', '/cgi-bin/test.cgi',
];

// Attack signature patterns in the full URL or body
const ATTACK_PATTERNS = [
  { pattern: /(\bunion\b.*\bselect\b|\bselect\b.*\bfrom\b)/i,  type: 'SQL Injection' },
  { pattern: /<script[\s>]/i,                                   type: 'XSS Attempt' },
  { pattern: /\.\.\//,                                          type: 'Path Traversal' },
  { pattern: /\bexec\b\s*\(/i,                                 type: 'Command Injection' },
  { pattern: /(\bOR\b\s+\d+=\d+|\bAND\b\s+\d+=\d+)/i,        type: 'SQL Injection' },
  { pattern: /curl|wget|python-requests|sqlmap|nikto|nmap/i,   type: 'Scanner Signature' },
];

// Decoy responses that look real
const DECOY_RESPONSES = {
  admin: `<!DOCTYPE html><html><head><title>Admin Login</title></head><body style="font-family:Arial;background:#1a1a2e;color:#e0e0e0;display:flex;align-items:center;justify-content:center;height:100vh"><div style="background:#16213e;padding:40px;border-radius:8px;width:320px"><h2 style="color:#0f3460;margin-bottom:24px">Admin Panel</h2><input type="text" placeholder="Username" style="width:100%;padding:10px;margin-bottom:12px;background:#0f3460;border:1px solid #533483;color:#fff;border-radius:4px"><input type="password" placeholder="Password" style="width:100%;padding:10px;margin-bottom:16px;background:#0f3460;border:1px solid #533483;color:#fff;border-radius:4px"><button style="width:100%;padding:10px;background:#533483;color:#fff;border:none;border-radius:4px;cursor:pointer">Login</button></div></body></html>`,
  env: `APP_ENV=production\nDB_HOST=db.internal.local\nDB_PORT=5432\nDB_USER=admin\nDB_PASS=p@ssw0rd2024!\nSECRET_KEY=supersecretkey123\nAWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nAWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n`,
  git: `[core]\n\trepositoryformatversion = 0\n\tfilemode = false\n\tbare = false\n[remote "origin"]\n\turl = https://github.com/internal/margdarshan-api.git\n`,
};

// In-memory IP blocklist (backed by Supabase for persistence)
const blockedIPs = new Set();

// Load blocked IPs from Supabase on startup
async function loadBlockedIPs() {
  try {
    const { data } = await supabase
      .from('blocked_ips')
      .select('ip')
      .eq('active', true);
    (data || []).forEach(r => blockedIPs.add(r.ip));
    console.log(`[Honeypot] Loaded ${blockedIPs.size} blocked IPs`);
  } catch { /* table may not exist yet */ }
}
loadBlockedIPs();

function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function computeRiskScore(req, path, matchedPatterns) {
  let score = 0;
  // Base: method
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) score += 20;
  // Path sensitivity
  if (path.includes('.env') || path.includes('.git')) score += 40;
  else if (path.includes('admin') || path.includes('phpmyadmin')) score += 30;
  else if (path.includes('wp-')) score += 20;
  else score += 10;
  // Attack patterns
  score += matchedPatterns.length * 25;
  return Math.min(score, 100);
}

async function logEvent(req, path, matchedPatterns, riskScore) {
  const ip = getClientIP(req);
  const body = req.body ? JSON.stringify(req.body).substring(0, 500) : null;

  try {
    await supabase.from('security_events').insert({
      ip_address:      ip,
      method:          req.method,
      path,
      query_string:    JSON.stringify(req.query),
      user_agent:      req.headers['user-agent'] || '',
      attack_types:    matchedPatterns,
      risk_score:      riskScore,
      body_sample:     body,
      headers_sample:  JSON.stringify({
        host: req.headers.host,
        referer: req.headers.referer,
        origin: req.headers.origin,
      }),
    });
  } catch { /* non-critical */ }

  // Auto-block IPs that score ≥ 80
  if (riskScore >= 80 && !blockedIPs.has(ip)) {
    blockedIPs.add(ip);
    try {
      await supabase.from('blocked_ips').upsert({
        ip, reason: `Auto-blocked (risk score ${riskScore})`, active: true,
      }, { onConflict: 'ip' });
    } catch { /* non-critical */ }
  }

  // Webhook alert for risk ≥ 70
  const webhookUrl = process.env.HONEYPOT_ALERT_WEBHOOK_URL;
  if (webhookUrl && riskScore >= 70) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 *MargDarshan Security Alert* — Risk ${riskScore}%\nIP: ${ip}\nPath: ${req.method} ${path}\nPatterns: ${matchedPatterns.join(', ') || 'honeypot probe'}`,
        }),
      });
    } catch { /* non-critical */ }
  }
}

function honeypot(req, res, next) {
  const ip   = getClientIP(req);
  const path = req.path.toLowerCase();
  const fullUrl = (req.url + JSON.stringify(req.query) + JSON.stringify(req.body || '')).toLowerCase();

  // Hard block
  if (blockedIPs.has(ip)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Check attack patterns on every request, even non-honeypot paths
  const matchedPatterns = ATTACK_PATTERNS
    .filter(p => p.pattern.test(fullUrl))
    .map(p => p.type);

  // Check if path is a honeypot trap
  const isHoneypotPath = HONEYPOT_PATHS.some(hp =>
    path === hp.toLowerCase() || path.startsWith(hp.toLowerCase() + '/')
  );

  if (isHoneypotPath || matchedPatterns.length > 0) {
    const riskScore = computeRiskScore(req, path, matchedPatterns);
    logEvent(req, req.path, matchedPatterns, riskScore); // fire-and-forget

    if (isHoneypotPath) {
      // Return convincing decoy response
      if (path.includes('admin') || path.includes('wp-') || path.includes('panel') || path.includes('login')) {
        return res.status(200).send(DECOY_RESPONSES.admin);
      }
      if (path.includes('.env')) {
        return res.status(200).type('text/plain').send(DECOY_RESPONSES.env);
      }
      if (path.includes('.git')) {
        return res.status(200).type('text/plain').send(DECOY_RESPONSES.git);
      }
      if (path.includes('phpmyadmin') || path.includes('sql')) {
        return res.status(200).json({
          version: '5.1.0',
          phpMyAdmin: '5.1.0',
          databases: ['information_schema', 'margdarshan_prod', 'user_data'],
        });
      }
      return res.status(403).json({ error: 'Access Denied', code: 'FORBIDDEN' });
    }
  }

  next();
}

module.exports = { honeypot, blockedIPs };
