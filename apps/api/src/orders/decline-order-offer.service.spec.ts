import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { DeclineOrderOfferService } from './decline-order-offer.service.js';
import { DomainError } from '../common/domain-error.js';

describe('DeclineOrderOfferService', () => {
  let offers: any;
  let service: DeclineOrderOfferService;

  beforeEach(() => {
    offers = { markDeclined: jest.fn() };
    service = new DeclineOrderOfferService(offers);
  });

  test('rejects a non-driver actor', async () => {
    await expect(
      service.declineOffer({ userId: 'u1', role: 'CUSTOMER' as const }, 'order-1'),
    ).rejects.toThrow(DomainError);
    expect(offers.markDeclined).not.toHaveBeenCalled();
  });

  test('404s when there is no pending offer for this driver', async () => {
    offers.markDeclined.mockResolvedValue(0);

    await expect(
      service.declineOffer({ userId: 'driver-1', role: 'DRIVER' as const }, 'order-1'),
    ).rejects.toThrow(DomainError);
  });

  test('marks the pending offer declined', async () => {
    offers.markDeclined.mockResolvedValue(1);

    await service.declineOffer({ userId: 'driver-1', role: 'DRIVER' as const }, 'order-1');

    expect(offers.markDeclined).toHaveBeenCalledWith('order-1', 'driver-1');
  });
});
