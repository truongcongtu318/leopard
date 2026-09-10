import baseConfig from '@leopard/config/eslint/base';

export default [
  ...baseConfig,
  {
    ignores: ['jest.config.cjs'],
  },
];
