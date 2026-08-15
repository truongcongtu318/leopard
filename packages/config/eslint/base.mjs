import babelParser from '@babel/eslint-parser';
import js from '@eslint/js';

export default [
  {
    ignores: [
      'coverage/**',
      'dist/**',
      'node_modules/**',
      '.next/**',
      '.expo/**',
      'playwright-report/**',
      'test-results/**',
      'blob-report/**',
      '**/jest.config.js',
    ],
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
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
  },
];
