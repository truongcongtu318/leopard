import { z } from 'zod';

import { VehicleType } from '@leopard/shared';

import { geoPointSchema, uuidSchema } from './common.js';

const orderLocationSchema = geoPointSchema
  .extend({
    label: z.string().trim().min(1).max(255),
  })
  .strict();

export const createOrderSchema = z
  .object({
    pickup: orderLocationSchema,
    stops: z.array(orderLocationSchema).max(3),
    dropoff: orderLocationSchema,
    vehicleType: z.enum(VehicleType),
    cargoNote: z.string().trim().min(1).max(1000),
    cargoWeightKg: z.number().finite().min(0).max(10_000).optional(),
    mediaIds: z.array(uuidSchema).max(5).optional(),
    estimateToken: z.string().trim().min(1),
  })
  .strict();
