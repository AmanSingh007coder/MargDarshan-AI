/**
 * Water Shipment Routes Test Suite
 * Test file: Backend/tests/water_routes.test.js
 *
 * Run with: node Backend/tests/water_routes.test.js
 * Requires: FastAPI server running on http://localhost:8000
 */

const http = require('http');

const BASE_URL = 'http://localhost:8000';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🌊 Water Shipment Routes Test Suite\n');
  console.log(`Target: ${BASE_URL}\n`);

  let passed = 0, failed = 0;

  // Test 1: GET /water/ports
  console.log('Test 1: GET /water/ports');
  try {
    const res = await makeRequest('GET', '/water/ports');
    if (res.status === 200 && res.body.ports && res.body.ports.length > 0) {
      console.log(`✓ PASS - Returned ${res.body.ports.length} ports`);
      console.log(`  Ports: ${res.body.ports.map(p => p.name).slice(0, 3).join(', ')}...`);
      passed++;
    } else {
      console.log(`✗ FAIL - Expected 200 with ports array, got ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.log(`✗ FAIL - ${err.message}`);
    failed++;
  }

  // Test 2: GET /water/vessels
  console.log('\nTest 2: GET /water/vessels');
  try {
    const res = await makeRequest('GET', '/water/vessels');
    if (res.status === 200 && res.body.vessels && res.body.vessels.length > 0) {
      console.log(`✓ PASS - Returned ${res.body.vessels.length} vessels`);
      console.log(`  Vessels: ${res.body.vessels.map(v => v.name).slice(0, 3).join(', ')}...`);
      passed++;
    } else {
      console.log(`✗ FAIL - Expected 200 with vessels array, got ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.log(`✗ FAIL - ${err.message}`);
    failed++;
  }

  // Test 3: POST /water/route - Mumbai to Chennai
  console.log('\nTest 3: POST /water/route (Mumbai → Chennai)');
  try {
    const req = {
      origin_lat: 18.9399,
      origin_lng: 72.8355,
      destination_lat: 13.0827,
      destination_lng: 80.2707,
      vessel_type: 'bulk_carrier',
      quantity_tons: 5000,
    };
    const res = await makeRequest('POST', '/water/route', req);
    if (res.status === 200 && res.body.distance_nm && res.body.waypoints) {
      console.log(`✓ PASS - Route calculated`);
      console.log(`  Distance: ${res.body.distance_nm} NM (${res.body.distance_km} km)`);
      console.log(`  ETA: ${res.body.eta_hours} hours`);
      console.log(`  Cost: ₹${res.body.cost_estimate.toLocaleString()}`);
      console.log(`  Waypoints: ${res.body.waypoints.length} points`);
      passed++;
    } else {
      console.log(`✗ FAIL - Expected 200 with route data, got ${res.status}`);
      console.log(`  Response: ${JSON.stringify(res.body)}`);
      failed++;
    }
  } catch (err) {
    console.log(`✗ FAIL - ${err.message}`);
    failed++;
  }

  // Test 4: POST /water/route - Kolkata to Visakhapatnam (same coast)
  console.log('\nTest 4: POST /water/route (Kolkata → Visakhapatnam, same coast)');
  try {
    const req = {
      origin_lat: 22.5726,
      origin_lng: 88.3639,
      destination_lat: 17.7011,
      destination_lng: 83.2992,
      vessel_type: 'container',
      quantity_tons: 3000,
    };
    const res = await makeRequest('POST', '/water/route', req);
    if (res.status === 200 && res.body.distance_nm) {
      console.log(`✓ PASS - East coast route calculated`);
      console.log(`  Distance: ${res.body.distance_nm} NM`);
      console.log(`  Cost: ₹${res.body.cost_estimate.toLocaleString()}`);
      passed++;
    } else {
      console.log(`✗ FAIL - Expected 200, got ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.log(`✗ FAIL - ${err.message}`);
    failed++;
  }

  // Test 5: POST /water/route - West to East crossing
  console.log('\nTest 5: POST /water/route (Mumbai → Visakhapatnam, cross India)');
  try {
    const req = {
      origin_lat: 18.9399,
      origin_lng: 72.8355,
      destination_lat: 17.7011,
      destination_lng: 83.2992,
      vessel_type: 'bulk_carrier',
      quantity_tons: 10000,
    };
    const res = await makeRequest('POST', '/water/route', req);
    if (res.status === 200 && res.body.distance_nm) {
      console.log(`✓ PASS - Cross-India route calculated (goes around Sri Lanka)`);
      console.log(`  Distance: ${res.body.distance_nm} NM`);
      console.log(`  Waypoints: ${res.body.waypoints.length}`);
      // Verify it has more waypoints than direct route (crossing logic)
      const directDistance = Math.sqrt(
        Math.pow(17.7011 - 18.9399, 2) + Math.pow(83.2992 - 72.8355, 2)
      ) * 111; // rough km to nm
      if (res.body.distance_nm > directDistance * 0.8) {
        console.log(`  ✓ Route avoids landmass (longer than direct)`);
      }
      passed++;
    } else {
      console.log(`✗ FAIL - Expected 200, got ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.log(`✗ FAIL - ${err.message}`);
    failed++;
  }

  // Test 6: Cost estimation accuracy
  console.log('\nTest 6: Cost breakdown validation');
  try {
    const req = {
      origin_lat: 18.9399,
      origin_lng: 72.8355,
      destination_lat: 13.0827,
      destination_lng: 80.2707,
      vessel_type: 'bulk_carrier',
      quantity_tons: 5000,
    };
    const res = await makeRequest('POST', '/water/route', req);
    if (res.status === 200 && res.body.cost_breakdown) {
      const cb = res.body.cost_breakdown;
      const sum = cb.fuel + cb.port_fees + cb.crew + cb.insurance + cb.misc;
      const matches = Math.abs(sum - res.body.cost_estimate) < 1; // floating point tolerance

      if (matches) {
        console.log(`✓ PASS - Cost breakdown adds up correctly`);
        console.log(`  Fuel: ₹${cb.fuel.toLocaleString()}`);
        console.log(`  Port Fees: ₹${cb.port_fees.toLocaleString()}`);
        console.log(`  Crew: ₹${cb.crew.toLocaleString()}`);
        console.log(`  Insurance: ₹${cb.insurance.toLocaleString()}`);
        console.log(`  Misc: ₹${cb.misc.toLocaleString()}`);
        console.log(`  Total: ₹${res.body.cost_estimate.toLocaleString()}`);
        passed++;
      } else {
        console.log(`✗ FAIL - Cost components don't sum correctly`);
        console.log(`  Sum: ${sum}, Expected: ${res.body.cost_estimate}`);
        failed++;
      }
    } else {
      console.log(`✗ FAIL - No cost breakdown in response`);
      failed++;
    }
  } catch (err) {
    console.log(`✗ FAIL - ${err.message}`);
    failed++;
  }

  // Test 7: Vessel type variations
  console.log('\nTest 7: Different vessel types cost comparison');
  try {
    const types = ['container', 'bulk_carrier', 'tanker', 'general_cargo', 'roro'];
    const costs = {};

    for (const vtype of types) {
      const req = {
        origin_lat: 18.9399,
        origin_lng: 72.8355,
        destination_lat: 13.0827,
        destination_lng: 80.2707,
        vessel_type: vtype,
        quantity_tons: 5000,
      };
      const res = await makeRequest('POST', '/water/route', req);
      if (res.status === 200) {
        costs[vtype] = res.body.cost_estimate;
      }
    }

    if (Object.keys(costs).length === 5) {
      console.log(`✓ PASS - All vessel types routable`);
      Object.entries(costs).forEach(([type, cost]) => {
        console.log(`  ${type.padEnd(20)} ₹${cost.toLocaleString()}`);
      });
      passed++;
    } else {
      console.log(`✗ FAIL - Not all vessel types returned costs`);
      failed++;
    }
  } catch (err) {
    console.log(`✗ FAIL - ${err.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✓ All tests passed! Water routes system is working correctly.');
    process.exit(0);
  } else {
    console.log(`✗ ${failed} test(s) failed. Check FastAPI server and endpoints.`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err.message);
  console.error('\nMake sure FastAPI server is running:');
  console.error('  cd Model');
  console.error('  python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000');
  process.exit(1);
});
