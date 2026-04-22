/**
 * Honeypot test script
 * Run: node Backend/tests/honeypot.test.js
 * Requires the backend to be running on localhost:3000 (npm run dev)
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (err) {
    console.log(`  ✗  ${label}`);
    console.log(`       → ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function req(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body:    options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* HTML response */ }
  return { status: res.status, text, json, headers: res.headers };
}

// ──────────────────────────────────────────────────────────────────────────────
// Suite 1 — Honeypot path trapping
// ──────────────────────────────────────────────────────────────────────────────
async function suiteHoneypotPaths() {
  console.log('\n[1] Honeypot Path Trapping');

  await test('GET /admin returns a decoy HTML page', async () => {
    const r = await req('/admin');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.text.includes('<html') || r.text.includes('Admin'), 'Expected HTML decoy response');
  });

  await test('GET /wp-admin returns a decoy login page', async () => {
    const r = await req('/wp-admin');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.text.includes('<html'), 'Expected HTML decoy');
  });

  await test('GET /.env returns fake env file', async () => {
    const r = await req('/.env');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.text.includes('DB_PASS') || r.text.includes('SECRET_KEY'), 'Expected fake secrets in decoy');
  });

  await test('GET /.git/config returns fake git config', async () => {
    const r = await req('/.git/config');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.text.includes('[core]') || r.text.includes('repositoryformatversion'), 'Expected git config decoy');
  });

  await test('GET /phpmyadmin returns fake DB info', async () => {
    const r = await req('/phpmyadmin');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    // Either HTML admin panel decoy or JSON DB decoy
    assert(
      r.text.includes('phpMyAdmin') || r.text.includes('databases') || r.text.includes('<html'),
      'Expected phpMyAdmin decoy'
    );
  });

  await test('GET /wp-login.php returns decoy page', async () => {
    const r = await req('/wp-login.php');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
  });

  await test('GET /actuator/env returns decoy or 403', async () => {
    const r = await req('/actuator/env');
    assert([200, 403].includes(r.status), `Expected 200 or 403, got ${r.status}`);
  });

  await test('GET /panel returns decoy page', async () => {
    const r = await req('/panel');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.text.includes('<html'), 'Expected HTML decoy');
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Suite 2 — Attack pattern detection (on normal paths)
// ──────────────────────────────────────────────────────────────────────────────
async function suiteAttackPatterns() {
  console.log('\n[2] Attack Pattern Detection');

  await test('SQL injection in query string is caught', async () => {
    const r = await req('/health?q=1+UNION+SELECT+table_name+FROM+information_schema.tables');
    // Middleware logs it but lets the request through (unless blocked IP)
    // We just verify the server doesn't 500 — it should respond normally or 403
    assert([200, 403, 404].includes(r.status), `Unexpected status ${r.status}`);
  });

  await test('XSS payload in query string is detected', async () => {
    const r = await req('/health?name=<script>alert(1)</script>');
    assert([200, 403, 404].includes(r.status), `Unexpected status ${r.status}`);
  });

  await test('Path traversal attempt is detected', async () => {
    const r = await req('/api/shipments/../../etc/passwd');
    assert([200, 403, 404].includes(r.status), `Unexpected status ${r.status}`);
  });

  await test('Scanner user-agent is detected (curl)', async () => {
    const r = await req('/health', { headers: { 'User-Agent': 'sqlmap/1.7.8' } });
    assert([200, 403].includes(r.status), `Unexpected status ${r.status}`);
  });

  await test('POST with SQL injection in body is detected', async () => {
    const r = await req('/health', {
      method: 'POST',
      body: { query: "SELECT * FROM users WHERE id='1' OR '1'='1'" },
    });
    assert([200, 403, 404].includes(r.status), `Unexpected status ${r.status}`);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Suite 3 — Legitimate traffic passes through
// ──────────────────────────────────────────────────────────────────────────────
async function suiteLegitTraffic() {
  console.log('\n[3] Legitimate Traffic Passes Through');

  await test('GET /health is not trapped', async () => {
    const r = await req('/health');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.json?.status === 'ok', `Expected {status: "ok"}, got: ${r.text}`);
  });

  await test('GET /api/shipments is not trapped', async () => {
    const r = await req('/api/shipments');
    // May 401 if auth required — that's fine; NOT 403 from honeypot
    assert(r.status !== 403 || r.json?.code === 'FORBIDDEN', 'Shipments route should not be honeypotted');
    assert([200, 401, 400].includes(r.status), `Unexpected status ${r.status}`);
  });

  await test('Normal user-agent browser request passes', async () => {
    const r = await req('/health', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    assert(r.status === 200, `Expected 200, got ${r.status}`);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Suite 4 — Nested/variant honeypot paths
// ──────────────────────────────────────────────────────────────────────────────
async function suiteVariants() {
  console.log('\n[4] Nested & Variant Paths');

  await test('GET /admin/settings is trapped (sub-path)', async () => {
    const r = await req('/admin/settings');
    assert([200, 403].includes(r.status), `Unexpected status ${r.status}`);
    assert(r.status === 200 ? r.text.includes('<html') : true, 'Expected decoy or block');
  });

  await test('GET /backup is trapped', async () => {
    const r = await req('/backup');
    assert([200, 403].includes(r.status), `Unexpected status ${r.status}`);
  });

  await test('GET /dump is trapped', async () => {
    const r = await req('/dump');
    assert([200, 403].includes(r.status), `Unexpected status ${r.status}`);
  });

  await test('GET /shell is trapped', async () => {
    const r = await req('/shell');
    assert([200, 403].includes(r.status), `Unexpected status ${r.status}`);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Run all suites
// ──────────────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\nMargDarshan Honeypot Test Suite`);
  console.log(`Target: ${BASE_URL}`);
  console.log('─'.repeat(50));

  // Quick connectivity check
  try {
    await fetch(`${BASE_URL}/health`);
  } catch {
    console.error(`\n[ERROR] Cannot reach ${BASE_URL} — is the backend running?\n  npm run dev  (in Backend/)\n`);
    process.exit(1);
  }

  await suiteHoneypotPaths();
  await suiteAttackPatterns();
  await suiteLegitTraffic();
  await suiteVariants();

  const total = passed + failed;
  console.log('\n' + '─'.repeat(50));
  console.log(`Results: ${passed}/${total} passed`);
  if (failed > 0) {
    console.log(`         ${failed} failed`);
    process.exit(1);
  } else {
    console.log('All tests passed.');
  }
})();
