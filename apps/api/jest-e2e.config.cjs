const baseConfig = require('./jest.config.cjs');

module.exports = {
  ...baseConfig,
  testTimeout: 30000,
  testRegex: '.*\\.(e2e-spec|integration-spec|matrix-spec)\\.ts$',
  testPathIgnorePatterns: [],
};
