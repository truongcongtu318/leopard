const baseConfig = require('./jest.config.cjs');

module.exports = {
  ...baseConfig,
  testRegex: 'database-schema\\.spec\\.ts$',
  testPathIgnorePatterns: [],
};
