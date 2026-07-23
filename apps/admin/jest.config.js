const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: [],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"],
  moduleDirectories: ["node_modules", "<rootDir>/"],
  moduleNameMapper: {
    "^@leopard/ui$": "<rootDir>/../../packages/ui/src/index.ts",
  },
};

module.exports = createJestConfig(customJestConfig);
