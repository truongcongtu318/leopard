import type { GeoPoint } from '@leopard/shared';
import { z } from 'zod';

export const uuidSchema = z.uuid();

export const isoDateSchema = z.iso.datetime({ offset: true });

export const geoPointSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict() satisfies z.ZodType<GeoPoint>;

export const pageQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
