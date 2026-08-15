import { z } from 'zod';

const databaseUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;

    return protocol === 'postgres:' || protocol === 'postgresql:';
  }, 'DATABASE_URL must use the postgres or postgresql protocol');

const corsOriginsSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.split(',').map((origin) => origin.trim()))
  .pipe(z.array(z.url()).min(1));

const secretSchema = z.string().trim().min(32, 'must contain at least 32 characters');
const booleanFlagSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');
const optionalProviderValue = (minimumLength = 1) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(minimumLength).optional(),
  );
const optionalProviderUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().url().optional(),
);
const nonNegativeIntegerSchema = z.coerce.number().int().nonnegative();
const vehicleRatesSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value, context) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({ code: 'custom', message: 'must contain valid JSON' });
      return z.NEVER;
    }
  })
  .pipe(
    z.strictObject({
      MOTORBIKE: z.strictObject({
        baseFareVnd: z.number().int().nonnegative(),
        perKmVnd: z.number().int().nonnegative(),
      }),
      VAN: z.strictObject({
        baseFareVnd: z.number().int().nonnegative(),
        perKmVnd: z.number().int().nonnegative(),
      }),
      TRUCK: z.strictObject({
        baseFareVnd: z.number().int().nonnegative(),
        perKmVnd: z.number().int().nonnegative(),
      }),
    }),
  );

const envSchema = z
  .strictObject({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3_000),
    DATABASE_URL: databaseUrlSchema,
    CORS_ORIGINS: corsOriginsSchema,
    AUTH_ACCESS_TOKEN_SECRET: secretSchema.optional(),
    AUTH_REFRESH_TOKEN_SECRET: secretSchema.optional(),
    ESTIMATE_TOKEN_HMAC_SECRET: secretSchema.optional(),
    PRICING_MINIMUM_FARE_VND: nonNegativeIntegerSchema.optional(),
    PRICING_STOP_SURCHARGE_VND: nonNegativeIntegerSchema.optional(),
    PRICING_VEHICLE_RATES_JSON: vehicleRatesSchema.optional(),
    MAP_PROVIDER: z.enum(['demo', 'vietmap']).optional(),
    SOCKET_PROVIDER: z.enum(['in-memory']).optional(),
    STORAGE_PROVIDER: z.enum(['local', 's3']).optional(),
    PAYMENT_PROVIDER: z.enum(['demo', 'payos', 'vietqr']).optional(),
    ALLOW_DEMO_PROVIDER: booleanFlagSchema.optional(),
    ALLOW_IN_MEMORY_SOCKET_PROVIDER: booleanFlagSchema.optional(),
    ALLOW_LOCAL_STORAGE_PROVIDER: booleanFlagSchema.optional(),
    ALLOW_DEMO_PAYMENT_PROVIDER: booleanFlagSchema.optional(),
    VIETMAP_API_KEY: z.string().trim().min(10).optional(),
    FIREBASE_PROJECT_ID: z.string().trim().min(1).optional(),
    S3_ACCESS_KEY_ID: optionalProviderValue(10),
    S3_SECRET_ACCESS_KEY: optionalProviderValue(10),
    S3_BUCKET: optionalProviderValue(),
    S3_REGION: optionalProviderValue(),
    S3_ENDPOINT: optionalProviderUrl,
    PAYOS_CLIENT_ID: optionalProviderValue(10),
    PAYOS_API_KEY: optionalProviderValue(10),
    PAYOS_CHECKSUM_KEY: optionalProviderValue(10),
  })
  .superRefine((env, context) => {
    if (env.STORAGE_PROVIDER === 's3') {
      requireConfiguration(
        env,
        ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET', 'S3_REGION'],
        'when STORAGE_PROVIDER=s3',
        context,
      );
    }

    if (env.PAYMENT_PROVIDER === 'payos') {
      requireConfiguration(
        env,
        ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'],
        'when PAYMENT_PROVIDER=payos',
        context,
      );
    }

    if (env.NODE_ENV !== 'production') {
      return;
    }

    const required = [
      'AUTH_ACCESS_TOKEN_SECRET',
      'AUTH_REFRESH_TOKEN_SECRET',
      'ESTIMATE_TOKEN_HMAC_SECRET',
      'PRICING_MINIMUM_FARE_VND',
      'PRICING_STOP_SURCHARGE_VND',
      'PRICING_VEHICLE_RATES_JSON',
      'MAP_PROVIDER',
      'SOCKET_PROVIDER',
      'STORAGE_PROVIDER',
      'PAYMENT_PROVIDER',
      'FIREBASE_PROJECT_ID',
    ] as const;

    requireConfiguration(env, required, 'in production', context);

    if (env.S3_ENDPOINT !== undefined) {
      validateProductionS3Endpoint(env.S3_ENDPOINT, context);
    }

    if (env.MAP_PROVIDER === 'vietmap' && env.VIETMAP_API_KEY === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['VIETMAP_API_KEY'],
        message: 'VIETMAP_API_KEY is required when MAP_PROVIDER=vietmap',
      });
    }

    if (env.MAP_PROVIDER === 'demo' && env.ALLOW_DEMO_PROVIDER !== true) {
      context.addIssue({
        code: 'custom',
        path: ['ALLOW_DEMO_PROVIDER'],
        message: 'ALLOW_DEMO_PROVIDER=true is required when MAP_PROVIDER=demo',
      });
    }

    if (
      env.SOCKET_PROVIDER === 'in-memory' &&
      env.ALLOW_IN_MEMORY_SOCKET_PROVIDER !== true
    ) {
      context.addIssue({
        code: 'custom',
        path: ['ALLOW_IN_MEMORY_SOCKET_PROVIDER'],
        message:
          'ALLOW_IN_MEMORY_SOCKET_PROVIDER=true is required when SOCKET_PROVIDER=in-memory',
      });
    }

    if (
      env.STORAGE_PROVIDER === 'local' &&
      env.ALLOW_LOCAL_STORAGE_PROVIDER !== true
    ) {
      context.addIssue({
        code: 'custom',
        path: ['ALLOW_LOCAL_STORAGE_PROVIDER'],
        message:
          'ALLOW_LOCAL_STORAGE_PROVIDER=true is required when STORAGE_PROVIDER=local',
      });
    }

    if (
      env.PAYMENT_PROVIDER === 'demo' &&
      env.ALLOW_DEMO_PAYMENT_PROVIDER !== true
    ) {
      context.addIssue({
        code: 'custom',
        path: ['ALLOW_DEMO_PAYMENT_PROVIDER'],
        message:
          'ALLOW_DEMO_PAYMENT_PROVIDER=true is required when PAYMENT_PROVIDER=demo',
      });
    }
  });

function requireConfiguration<
  TEnvironment extends Readonly<Record<string, unknown>>,
  TName extends keyof TEnvironment & string,
>(
  environment: TEnvironment,
  names: readonly TName[],
  condition: string,
  context: z.RefinementCtx,
): void {
  for (const name of names) {
    if (environment[name] === undefined) {
      context.addIssue({
        code: 'custom',
        path: [name],
        message: `${name} is required ${condition}`,
      });
    }
  }
}

function validateProductionS3Endpoint(
  endpoint: string,
  context: z.RefinementCtx,
): void {
  const url = new URL(endpoint);
  const hostname = url.hostname
    .replace(/^\[|\]$/gu, '')
    .replace(/\.+$/u, '')
    .toLowerCase();
  const isLoopback =
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.startsWith('127.') ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '0:0:0:0:0:0:0:1' ||
    hostname.includes(':127.');
  const isIpv4MappedIpv6 =
    hostname.startsWith('::ffff:') || hostname.startsWith('0:0:0:0:0:ffff:');
  const isLinkLocal =
    hostname.startsWith('169.254.') ||
    /^fe[89ab][0-9a-f](?::|$)/u.test(hostname) ||
    hostname === 'metadata.google.internal';

  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    url.hash !== '' ||
    isLoopback ||
    isIpv4MappedIpv6 ||
    isLinkLocal
  ) {
    context.addIssue({
      code: 'custom',
      path: ['S3_ENDPOINT'],
      message: 'S3_ENDPOINT must be a safe HTTPS endpoint in production',
    });
  }
}

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse({
    NODE_ENV: source.NODE_ENV,
    PORT: source.PORT,
    DATABASE_URL: source.DATABASE_URL,
    CORS_ORIGINS: source.CORS_ORIGINS,
    AUTH_ACCESS_TOKEN_SECRET: source.AUTH_ACCESS_TOKEN_SECRET,
    AUTH_REFRESH_TOKEN_SECRET: source.AUTH_REFRESH_TOKEN_SECRET,
    ESTIMATE_TOKEN_HMAC_SECRET: source.ESTIMATE_TOKEN_HMAC_SECRET,
    PRICING_MINIMUM_FARE_VND: source.PRICING_MINIMUM_FARE_VND,
    PRICING_STOP_SURCHARGE_VND: source.PRICING_STOP_SURCHARGE_VND,
    PRICING_VEHICLE_RATES_JSON: source.PRICING_VEHICLE_RATES_JSON,
    MAP_PROVIDER: source.MAP_PROVIDER,
    SOCKET_PROVIDER: source.SOCKET_PROVIDER,
    STORAGE_PROVIDER: source.STORAGE_PROVIDER,
    PAYMENT_PROVIDER: source.PAYMENT_PROVIDER,
    ALLOW_DEMO_PROVIDER: source.ALLOW_DEMO_PROVIDER,
    ALLOW_IN_MEMORY_SOCKET_PROVIDER: source.ALLOW_IN_MEMORY_SOCKET_PROVIDER,
    ALLOW_LOCAL_STORAGE_PROVIDER: source.ALLOW_LOCAL_STORAGE_PROVIDER,
    ALLOW_DEMO_PAYMENT_PROVIDER: source.ALLOW_DEMO_PAYMENT_PROVIDER,
    VIETMAP_API_KEY: source.VIETMAP_API_KEY,
    FIREBASE_PROJECT_ID: source.FIREBASE_PROJECT_ID,
    S3_ACCESS_KEY_ID: source.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: source.S3_SECRET_ACCESS_KEY,
    S3_BUCKET: source.S3_BUCKET,
    S3_REGION: source.S3_REGION,
    S3_ENDPOINT: source.S3_ENDPOINT,
    PAYOS_CLIENT_ID: source.PAYOS_CLIENT_ID,
    PAYOS_API_KEY: source.PAYOS_API_KEY,
    PAYOS_CHECKSUM_KEY: source.PAYOS_CHECKSUM_KEY,
  });
}
