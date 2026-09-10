import baseConfig from '@leopard/config/eslint/base';

export default [
  ...baseConfig,
  {
    files: ['**/*.cjs'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
      },
      sourceType: 'commonjs',
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        babelOptions: {
          parserOpts: {
            plugins: ['decorators-legacy'],
          },
          presets: ['@babel/preset-typescript'],
        },
        requireConfigFile: false,
      },
    },
  },
];
