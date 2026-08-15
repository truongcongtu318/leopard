import { parseEnv } from './env.schema.js';

const validProductionEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  PORT: '3000',
  DATABASE_URL: 'postgresql://leopard:secret@postgres:5432/leopard',
  CORS_ORIGINS: 'https://ops.leopard.vn',
  AUTH_ACCESS_TOKEN_SECRET: 'a'.repeat(32),
  AUTH_REFRESH_TOKEN_SECRET: 'b'.repeat(32),
  ESTIMATE_TOKEN_HMAC_SECRET: 'c'.repeat(32),
  PRICING_MINIMUM_FARE_VND: '10000',
  PRICING_STOP_SURCHARGE_VND: '2500',
  PRICING_VEHICLE_RATES_JSON: JSON.stringify({
    MOTORBIKE: { baseFareVnd: 10_000, perKmVnd: 3_500 },
    VAN: { baseFareVnd: 20_000, perKmVnd: 8_000 },
    TRUCK: { baseFareVnd: 35_000, perKmVnd: 12_000 },
  }),
  MAP_PROVIDER: 'vietmap',
  ALLOW_DEMO_PROVIDER: 'false',
  VIETMAP_API_KEY: 'vietmap-production-key',
  FIREBASE_PROJECT_ID: 'leopard-production',
  SOCKET_PROVIDER: 'in-memory',
  ALLOW_IN_MEMORY_SOCKET_PROVIDER: 'true',
  STORAGE_PROVIDER: 's3',
  S3_ACCESS_KEY_ID: '1234567890',
  S3_SECRET_ACCESS_KEY: '1234567890',
  S3_BUCKET: 'bucket',
  S3_REGION: 'us-east-1',
  PAYMENT_PROVIDER: 'payos',
  PAYOS_CLIENT_ID: '1234567890',
  PAYOS_API_KEY: '1234567890',
  PAYOS_CHECKSUM_KEY: '1234567890',
};

describe('production environment schema', () => {
  it('accepts a complete production configuration', () => {
    expect(parseEnv(validProductionEnv)).toMatchObject({
      NODE_ENV: 'production',
      MAP_PROVIDER: 'vietmap',
      ALLOW_DEMO_PROVIDER: false,
    });
  });

  it.each([
    'AUTH_ACCESS_TOKEN_SECRET',
    'AUTH_REFRESH_TOKEN_SECRET',
    'ESTIMATE_TOKEN_HMAC_SECRET',
    'PRICING_MINIMUM_FARE_VND',
    'PRICING_STOP_SURCHARGE_VND',
    'PRICING_VEHICLE_RATES_JSON',
    'VIETMAP_API_KEY',
    'FIREBASE_PROJECT_ID',
    'SOCKET_PROVIDER',
    'STORAGE_PROVIDER',
    'PAYMENT_PROVIDER',
  ])('fails fast when %s is missing', (name) => {
    expect(() => parseEnv({ ...validProductionEnv, [name]: undefined })).toThrow();
  });

  it('rejects short production secrets without exposing their values', () => {
    const exposedSecret = 'too-short-secret';

    try {
      parseEnv({
        ...validProductionEnv,
        AUTH_ACCESS_TOKEN_SECRET: exposedSecret,
      });
      throw new Error('Expected configuration validation to fail');
    } catch (error) {
      expect(String(error)).not.toContain(exposedSecret);
    }
  });

  it('requires explicit opt-in when the demo map provider is selected', () => {
    expect(() =>
      parseEnv({
        ...validProductionEnv,
        MAP_PROVIDER: 'demo',
        ALLOW_DEMO_PROVIDER: 'false',
        VIETMAP_API_KEY: undefined,
      }),
    ).toThrow();
  });
});
