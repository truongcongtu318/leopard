// apps/driver/src/features/wallet/adapter.test.ts
import { describe, expect, it, jest } from '@jest/globals';

import { createDriverWalletHttpAdapter } from './adapter';

describe('createDriverWalletHttpAdapter', () => {
  it('maps GET /driver/wallet to a WalletSummary with real balanceVnd and recentPayouts', async () => {
    const get = jest.fn(async () => ({
      balanceVnd: 200000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
      recentPayouts: [
        {
          id: 'wr-1',
          status: 'PENDING',
          amountVnd: 50000,
          bankName: 'MB Bank',
          bankAccountNumber: '0987654321',
          bankAccountName: 'NGUYEN VAN A',
          createdAt: '2026-09-13T00:00:00.000Z',
        },
      ],
    }));
    const adapter = createDriverWalletHttpAdapter({ get: get as any, post: jest.fn() as any });

    const summary = await adapter.getWalletSummary();

    expect(get).toHaveBeenCalledWith('/driver/wallet');
    expect(summary.availableBalanceVnd).toBe(200000);
    expect(summary.pendingWithdrawalVnd).toBe(50000);
    expect(summary.bankName).toBe('MB Bank');
  });

  it('posts a payout request to /driver/payout and auto-generates clientRequestId', async () => {
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
      '/driver/payout',
      expect.objectContaining({ amountVnd: 100000, clientRequestId: expect.any(String) }),
    );
    expect(result.status).toBe('PENDING');
  });

  it('retrieves withdrawal history from /driver/wallet recentPayouts', async () => {
    const get = jest.fn(async () => ({
      balanceVnd: 150000,
      recentPayouts: [
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
    }));
    const adapter = createDriverWalletHttpAdapter({ get: get as any, post: jest.fn() as any });

    const history = await adapter.getWithdrawalHistory();

    expect(get).toHaveBeenCalledWith('/driver/wallet');
    expect(history.items[0].status).toBe('APPROVED');
    expect(history.items[0].amountVnd).toBe(50000);
  });
});
