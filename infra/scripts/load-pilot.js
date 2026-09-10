#!/usr/bin/env node

/**
 * LEOPARD Pilot Load Test Script
 *
 * Simulates representative read/write load against the API server
 * with seed-volume traffic patterns for pilot baseline measurement.
 *
 * Usage:
 *   node infra/scripts/load-pilot.js [--base-url=http://localhost:3000] [--duration=30] [--concurrency=10]
 *
 * Measures: p50, p95, p99, error rate, and per-endpoint latency breakdown.
 */

const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

// --- Configuration ---
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value;
  return acc;
}, {});

const BASE_URL = args['base-url'] || process.env.LOAD_TEST_BASE_URL || 'http://localhost:3000';
const DURATION_SECONDS = parseInt(args['duration'] || '30', 10);
const CONCURRENCY = parseInt(args['concurrency'] || '10', 10);
const DEMO_LOGIN_ENABLED = true;

// --- Metrics Store ---
const metrics = {
  requests: 0,
  errors: 0,
  latencies: [],
  byEndpoint: {},
  byStatus: {},
  startTime: 0,
};

function recordLatency(endpoint, latencyMs, statusCode) {
  metrics.requests++;
  metrics.latencies.push(latencyMs);

  if (!metrics.byEndpoint[endpoint]) {
    metrics.byEndpoint[endpoint] = { count: 0, latencies: [], errors: 0 };
  }
  metrics.byEndpoint[endpoint].count++;
  metrics.byEndpoint[endpoint].latencies.push(latencyMs);

  metrics.byStatus[statusCode] = (metrics.byStatus[statusCode] || 0) + 1;

  if (statusCode >= 500) {
    metrics.errors++;
    metrics.byEndpoint[endpoint].errors++;
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function computeStats(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    count: sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0] || 0,
    max: sorted[sorted.length - 1] || 0,
    avg: sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0,
  };
}

// --- HTTP Client ---
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
      },
      timeout: 10000,
    };

    const start = performance.now();
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const latency = Math.round(performance.now() - start);
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed, latency });
      });
    });

    req.on('error', (err) => {
      const latency = Math.round(performance.now() - start);
      reject({ error: err.message, latency });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ error: 'TIMEOUT', latency: 10000 });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// --- Scenario Definitions ---
async function loginDemo(role) {
  try {
    const res = await makeRequest('POST', '/auth/login/demo', { role });
    if (res.status === 201 && res.body.accessToken) {
      return res.body.accessToken;
    }
    console.error(`  ⚠ Demo login failed for ${role}: ${res.status}`);
    return null;
  } catch (e) {
    console.error(`  ⚠ Demo login error for ${role}: ${e.error}`);
    return null;
  }
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

const scenarios = [
  // Read-heavy Customer journey
  { name: 'GET /orders', weight: 3, run: async (tokens) => {
    const res = await makeRequest('GET', '/orders?page=1&pageSize=20', null, authHeader(tokens.customer));
    recordLatency('GET /orders', res.latency, res.status);
  }},
  { name: 'GET /me', weight: 2, run: async (tokens) => {
    const res = await makeRequest('GET', '/me', null, authHeader(tokens.customer));
    recordLatency('GET /me', res.latency, res.status);
  }},
  // Driver read journey
  { name: 'GET /driver/orders/available', weight: 2, run: async (tokens) => {
    const res = await makeRequest('GET', '/driver/orders/available?page=1&pageSize=20', null, authHeader(tokens.driver));
    recordLatency('GET /driver/orders/available', res.latency, res.status);
  }},
  { name: 'PATCH /driver/availability', weight: 1, run: async (tokens) => {
    const avail = Math.random() > 0.5 ? 'AVAILABLE' : 'BUSY';
    const res = await makeRequest('PATCH', '/driver/availability', { availability: avail }, authHeader(tokens.driver));
    recordLatency('PATCH /driver/availability', res.latency, res.status);
  }},
  // Fleet Owner read journey
  { name: 'GET /fleet/profile', weight: 1, run: async (tokens) => {
    if (!tokens.fleetOwner) return;
    const res = await makeRequest('GET', '/fleet/profile', null, authHeader(tokens.fleetOwner));
    recordLatency('GET /fleet/profile', res.latency, res.status);
  }},
  { name: 'GET /fleet/orders', weight: 1, run: async (tokens) => {
    if (!tokens.fleetOwner) return;
    const res = await makeRequest('GET', '/fleet/orders?page=1&pageSize=20', null, authHeader(tokens.fleetOwner));
    recordLatency('GET /fleet/orders', res.latency, res.status);
  }},
  // Admin read journey
  { name: 'GET /admin/dashboard', weight: 1, run: async (tokens) => {
    const res = await makeRequest('GET', '/admin/dashboard', null, authHeader(tokens.admin));
    recordLatency('GET /admin/dashboard', res.latency, res.status);
  }},
  { name: 'GET /admin/orders', weight: 1, run: async (tokens) => {
    const res = await makeRequest('GET', '/admin/orders?page=1&pageSize=20', null, authHeader(tokens.admin));
    recordLatency('GET /admin/orders', res.latency, res.status);
  }},
  // Write: Estimate order (pricing computation)
  { name: 'POST /orders/estimate', weight: 2, run: async (tokens) => {
    const res = await makeRequest('POST', '/orders/estimate', {
      pickup: { type: 'PICKUP', address: '227 Nguyen Van Cu, Q5, HCM', lat: 10.7626, lng: 106.6822 },
      dropoff: { type: 'DROPOFF', address: '1 Vo Van Ngan, Thu Duc, HCM', lat: 10.8494, lng: 106.7722 },
      vehicleType: 'MOTORBIKE',
    }, authHeader(tokens.customer));
    recordLatency('POST /orders/estimate', res.latency, res.status);
  }},
  // Health check
  { name: 'GET /health', weight: 1, run: async () => {
    const res = await makeRequest('GET', '/health');
    recordLatency('GET /health', res.latency, res.status);
  }},
];

function pickScenario() {
  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  let r = Math.random() * totalWeight;
  for (const s of scenarios) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return scenarios[0];
}

// --- Main ---
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          LEOPARD Pilot Load Test                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Base URL:     ${BASE_URL}`);
  console.log(`  Duration:     ${DURATION_SECONDS}s`);
  console.log(`  Concurrency:  ${CONCURRENCY}`);
  console.log();

  // 1. Authenticate demo users
  console.log('🔑 Authenticating demo users...');
  const tokens = {
    customer: await loginDemo('CUSTOMER'),
    driver: await loginDemo('DRIVER'),
    fleetOwner: await loginDemo('FLEET_OWNER'),
    admin: await loginDemo('ADMIN'),
  };

  const authenticated = Object.entries(tokens).filter(([, v]) => v !== null);
  console.log(`  ✓ ${authenticated.length}/4 roles authenticated`);
  if (!tokens.customer || !tokens.admin) {
    console.error('  ✗ Customer and Admin tokens required. Ensure AUTH_DEMO_LOGIN_ENABLED=true.');
    process.exit(1);
  }
  console.log();

  // 2. Run load
  console.log(`🏃 Running load for ${DURATION_SECONDS}s with ${CONCURRENCY} concurrent workers...`);
  metrics.startTime = Date.now();
  const deadline = metrics.startTime + DURATION_SECONDS * 1000;
  let running = true;

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (running && Date.now() < deadline) {
      const scenario = pickScenario();
      try {
        await scenario.run(tokens);
      } catch (e) {
        metrics.errors++;
        recordLatency(scenario.name, e.latency || 0, 0);
      }
    }
  });

  // Progress indicator
  const progressInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - metrics.startTime) / 1000);
    const rps = metrics.requests / Math.max(1, elapsed);
    process.stdout.write(`\r  ⏱ ${elapsed}s/${DURATION_SECONDS}s | ${metrics.requests} reqs | ${rps.toFixed(1)} rps | ${metrics.errors} errors`);
  }, 1000);

  await Promise.all(workers);
  running = false;
  clearInterval(progressInterval);
  console.log('\n');

  // 3. Report
  const elapsed = (Date.now() - metrics.startTime) / 1000;
  const overall = computeStats(metrics.latencies);

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          LOAD TEST RESULTS                              ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Duration:       ${elapsed.toFixed(1)}s`);
  console.log(`║  Total Requests: ${metrics.requests}`);
  console.log(`║  RPS:            ${(metrics.requests / elapsed).toFixed(1)}`);
  console.log(`║  Errors:         ${metrics.errors} (${((metrics.errors / Math.max(1, metrics.requests)) * 100).toFixed(2)}%)`);
  console.log(`║  P50 Latency:    ${overall.p50}ms`);
  console.log(`║  P95 Latency:    ${overall.p95}ms  ${overall.p95 <= 800 ? '✅ < 800ms' : '⚠️ > 800ms'}`);
  console.log(`║  P99 Latency:    ${overall.p99}ms`);
  console.log(`║  Min/Max:        ${overall.min}ms / ${overall.max}ms`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Per-Endpoint Breakdown:');

  for (const [ep, data] of Object.entries(metrics.byEndpoint).sort((a, b) => b[1].count - a[1].count)) {
    const stats = computeStats(data.latencies);
    const pass = stats.p95 <= 800 ? '✅' : '⚠️';
    console.log(`║    ${ep.padEnd(32)} ${String(stats.count).padStart(4)} reqs  p50=${String(stats.p50).padStart(4)}ms  p95=${String(stats.p95).padStart(4)}ms ${pass}  err=${data.errors}`);
  }

  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Status Code Distribution:');
  for (const [status, count] of Object.entries(metrics.byStatus).sort()) {
    console.log(`║    HTTP ${status}: ${count}`);
  }
  console.log('╚══════════════════════════════════════════════════════════╝');

  // 4. Exit code based on SLA
  if (overall.p95 > 800) {
    console.log('\n⚠️  WARN: P95 latency exceeds 800ms target (excluding provider latency).');
    process.exit(1);
  }
  if (metrics.errors / Math.max(1, metrics.requests) > 0.05) {
    console.log('\n⚠️  WARN: Error rate exceeds 5% threshold.');
    process.exit(1);
  }
  console.log('\n✅ All performance SLAs met.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
