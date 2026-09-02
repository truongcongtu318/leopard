import baseConfig from '../../packages/config/eslint/base.mjs';

export default [
  ...baseConfig,
  {
    ignores: ['Leopard system mobile app-handoff/**', 'dist/**', '.expo/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        babelOptions: {
          presets: ['babel-preset-expo'],
        },
        requireConfigFile: false,
      },
    },
  },
  {
    files: ['babel.config.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
      },
      sourceType: 'commonjs',
    },
  },
];
