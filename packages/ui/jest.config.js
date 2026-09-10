/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": ["@swc/jest", {}],
  },
  moduleNameMapper: {
    "\\.css$": "<rootDir>/src/__mocks__/styleMock.js",
  },
};

export default config;
