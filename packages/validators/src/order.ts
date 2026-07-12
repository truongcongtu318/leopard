import { z } from 'zod';

import { geoPointSchema, uuidSchema } from './common.js';

const supportedVehicleTypes = ['MOTORBIKE', 'VAN', 'TRUCK'] as const;

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
    vehicleType: z.enum(supportedVehicleTypes),
    cargoNote: z.string().trim().min(1).max(1000),
    cargoWeightKg: z.number().finite().positive().optional(),
    mediaIds: z.array(uuidSchema).max(5).optional(),
    estimateToken: z.string().trim().min(1),
  })
  .strict();
