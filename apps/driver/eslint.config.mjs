import baseConfig from '../../packages/config/eslint/base.mjs';

export default [
  ...baseConfig,
  {
    ignores: ['dist/**', '.expo/**'],
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
    files: ['babel.config.js', 'metro.config.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
      },
      sourceType: 'commonjs',
    },
  },
];
