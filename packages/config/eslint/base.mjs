import babelParser from '@babel/eslint-parser';
import js from '@eslint/js';

export default [
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**', '.next/**', '.expo/**', '**/jest.config.js'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        babelOptions: {
          presets: ['@babel/preset-typescript'],
        },
        requireConfigFile: false,
      },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      // `@babel/preset-typescript` parses `abstract` methods with `body: undefined`,
      // which crashes these two core rules (`getter-return` reads `node.body.type`,
      // `no-dupe-args` reads a token range). TypeScript already enforces both at
      // compile time, so disabling them for .ts/.tsx is safe.
      'getter-return': 'off',
      'no-dupe-args': 'off',
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
  },
];
