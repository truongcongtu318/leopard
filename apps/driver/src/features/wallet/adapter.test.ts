// apps/driver/src/features/wallet/adapter.test.ts
import { describe, expect, it, jest } from '@jest/globals';

import { createDriverWalletHttpAdapter } from './adapter';

describe('createDriverWalletHttpAdapter', () => {
  it('getWalletSummary passes through BE aggregates without client recompute', async () => {
    const get = jest.fn(async () => ({
      availableBalanceVnd: 200000,
      lifetimeDeliveredVnd: 500000,
      pendingWithdrawalVnd: 100000,
      deliveredOrderCount: 7,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    }));
    const adapter = createDriverWalletHttpAdapter({ get: get as any, post: jest.fn() as any });

    expect(await adapter.getWalletSummary()).toEqual({
      availableBalanceVnd: 200000,
      lifetimeDeliveredVnd: 500000,
      pendingWithdrawalVnd: 100000,
      deliveredOrderCount: 7,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    });
    expect(get).toHaveBeenCalledWith('/driver/wallet');
  });

  it('requestWithdrawal sends bank fields to POST /driver/wallet/withdrawals', async () => {
    const post = jest.fn(async () => ({ id: 'w1', status: 'PENDING' }));
    const adapter = createDriverWalletHttpAdapter({ get: jest.fn() as any, post: post as any });

    await adapter.requestWithdrawal({
      amountVnd: 100000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    });

    expect(post).toHaveBeenCalledWith(
      '/driver/wallet/withdrawals',
      expect.objectContaining({
        amountVnd: 100000,
        bankName: 'MB Bank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN VAN A',
        clientRequestId: expect.any(String),
      }),
    );
  });

  it('getWithdrawalHistory calls GET /driver/wallet/withdrawals with paging', async () => {
    const get = jest.fn(async () => ({
      items: [{ id: 'w1' }],
      total: 1,
      page: 2,
      pageSize: 20,
      totalPages: 1,
    }));
    const adapter = createDriverWalletHttpAdapter({ get: get as any, post: jest.fn() as any });

    const res = await adapter.getWithdrawalHistory(2, 20);

    expect(get).toHaveBeenCalledWith('/driver/wallet/withdrawals?page=2&pageSize=20');
    expect(res.total).toBe(1);
  });
});
