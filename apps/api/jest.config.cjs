module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.(spec|test)\\.ts$',
  testPathIgnorePatterns: ['database-schema\\.spec\\.ts', '.*\\.e2e-spec\\.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@leopard/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@leopard/shared/(.*)\\.js$': '<rootDir>/../../packages/shared/src/$1.ts',
    '^@leopard/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@leopard/validators$': '<rootDir>/../../packages/validators/src/index.ts',
    '^@leopard/validators/(.*)\\.js$': '<rootDir>/../../packages/validators/src/$1.ts',
    '^@leopard/validators/(.*)$': '<rootDir>/../../packages/validators/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        sourceMaps: true,
        module: {
          type: 'es6',
        },
        jsc: {
          target: 'es2022',
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
      },
    ],
  },
};
