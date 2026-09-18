// apps/api/src/drivers/dto/topup-wallet.dto.ts
import { z } from 'zod';

export const topupWalletSchema = z.object({
  amountVnd: z
    .number()
    .int('Số tiền phải là số nguyên')
    .min(50000, 'Số tiền nạp tối thiểu là 50.000 ₫')
    .max(50000000, 'Số tiền nạp tối đa mỗi lần là 50.000.000 ₫'),
  clientRequestId: z.string().trim().min(1).optional(),
});

export type TopupWalletDto = z.infer<typeof topupWalletSchema>;
