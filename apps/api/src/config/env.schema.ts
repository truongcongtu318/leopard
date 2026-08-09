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
    ALLOW_DEMO_PROVIDER: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    VIETMAP_API_KEY: z.string().trim().min(10).optional(),
    FIREBASE_PROJECT_ID: z.string().trim().min(1).optional(),
  })
  .superRefine((env, context) => {
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
      'FIREBASE_PROJECT_ID',
    ] as const;

    for (const name of required) {
      if (env[name] === undefined) {
        context.addIssue({
          code: 'custom',
          path: [name],
          message: `${name} is required in production`,
        });
      }
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
  });

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
    ALLOW_DEMO_PROVIDER: source.ALLOW_DEMO_PROVIDER,
    VIETMAP_API_KEY: source.VIETMAP_API_KEY,
    FIREBASE_PROJECT_ID: source.FIREBASE_PROJECT_ID,
  });
}
