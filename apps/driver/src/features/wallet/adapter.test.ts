// apps/driver/src/features/wallet/adapter.test.ts
import { describe, expect, it, jest } from '@jest/globals';

import { createDriverWalletHttpAdapter } from './adapter';

describe('createDriverWalletHttpAdapter', () => {
  it('maps GET /driver/wallet to a WalletSummary', async () => {
    const get = jest.fn(async () => ({
      availableBalanceVnd: 200000,
      lifetimeDeliveredVnd: 500000,
      pendingWithdrawalVnd: 100000,
      deliveredOrderCount: 5,
    }));
    const adapter = createDriverWalletHttpAdapter({ get: get as any, post: jest.fn() as any });

    const summary = await adapter.getWalletSummary();

    expect(get).toHaveBeenCalledWith('/driver/wallet');
    expect(summary.availableBalanceVnd).toBe(200000);
  });

  it('posts a withdrawal request and auto-generates a clientRequestId when none given', async () => {
    const post = jest.fn(async () => ({
      id: 'wr-1',
      status: 'PENDING',
      amountVnd: 100000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
      createdAt: '2026-09-13T00:00:00.000Z',
    }));
    const adapter = createDriverWalletHttpAdapter({ get: jest.fn() as any, post: post as any });

    const result = await adapter.requestWithdrawal({
      amountVnd: 100000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
    });

    expect(post).toHaveBeenCalledWith(
      '/driver/wallet/withdrawals',
      expect.objectContaining({ amountVnd: 100000, clientRequestId: expect.any(String) }),
    );
    expect(result.status).toBe('PENDING');
  });

  it('maps GET /driver/wallet/withdrawals to a list of history items', async () => {
    const get = jest.fn(async () => ({
      items: [
        {
          id: 'wr-1',
          status: 'APPROVED',
          amountVnd: 50000,
          bankName: 'MB Bank',
          bankAccountNumber: '0987654321',
          bankAccountName: 'NGUYEN VAN A',
          createdAt: '2026-09-10T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    }));
    const adapter = createDriverWalletHttpAdapter({ get: get as any, post: jest.fn() as any });

    const history = await adapter.getWithdrawalHistory();

    expect(get).toHaveBeenCalledWith('/driver/wallet/withdrawals?page=1&pageSize=20');
    expect(history.items[0].status).toBe('APPROVED');
  });
});
