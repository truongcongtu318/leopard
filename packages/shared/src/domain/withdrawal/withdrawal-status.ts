export const WithdrawalStatus = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type WithdrawalStatus = (typeof WithdrawalStatus)[number];
