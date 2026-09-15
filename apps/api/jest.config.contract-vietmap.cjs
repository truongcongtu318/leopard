const baseConfig = require('./jest.config.cjs');

// Dedicated config for the opt-in, real-Vietmap contract test (spec §3.1bis
// point 3). Mirrors the jest-e2e.config.cjs pattern: extend the base config
// but swap testRegex to target only the `.contract-spec.ts` file, and clear
// testPathIgnorePatterns (which otherwise only excludes database-schema and
// e2e-spec files — irrelevant here, but kept explicit for clarity).
//
// This config is never referenced by `test` or `test:contract` — only by
// the `test:contract:vietmap` script, which a human runs manually with
// RUN_VIETMAP_CONTRACT_TESTS=true and a real VIETMAP_API_KEY exported.
module.exports = {
  ...baseConfig,
  testRegex: '.*\\.contract-spec\\.ts$',
  testPathIgnorePatterns: [],
  // The test makes 3 sequential real network calls, and VietmapProvider has
  // its own 5000ms per-request timeout with up to 2 retry attempts — a
  // single retry on one call alone can approach 10s, and worst case across
  // 3 calls approaches 30s. Jest's 5000ms default would false-negative on
  // ordinary real-world latency. Match jest-e2e.config.cjs's precedent of a
  // generous whole-test budget for suites that make real external calls.
  testTimeout: 30000,
};
