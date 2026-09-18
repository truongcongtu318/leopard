import { customerQueryKeys, driverQueryKeys } from './query-keys';

describe('Query Key Factories', () => {
  it('generates correct hierarchical keys for customer', () => {
    expect(customerQueryKeys.all).toEqual(['customer']);
    expect(customerQueryKeys.orders()).toEqual(['customer', 'orders']);
    expect(customerQueryKeys.orderList('ACTIVE')).toEqual(['customer', 'orders', { filter: 'ACTIVE' }]);
    expect(customerQueryKeys.orderList()).toEqual(['customer', 'orders']);
    expect(customerQueryKeys.orderDetail('ord-123')).toEqual(['customer', 'order', 'ord-123']);
    expect(customerQueryKeys.wallet()).toEqual(['customer', 'wallet']);
    expect(customerQueryKeys.profile()).toEqual(['customer', 'profile']);
    expect(customerQueryKeys.notifications()).toEqual(['customer', 'notifications']);
  });

  it('generates correct hierarchical keys for driver', () => {
    expect(driverQueryKeys.all).toEqual(['driver']);
    expect(driverQueryKeys.orders()).toEqual(['driver', 'orders']);
    expect(driverQueryKeys.orderDetail('ord-456')).toEqual(['driver', 'order', 'ord-456']);
    expect(driverQueryKeys.routeEta('ord-456')).toEqual(['driver', 'order', 'ord-456', 'route-eta']);
    expect(driverQueryKeys.profile()).toEqual(['driver', 'profile']);
    expect(driverQueryKeys.wallet()).toEqual(['driver', 'wallet']);
    expect(driverQueryKeys.walletSummary()).toEqual(['driver', 'wallet', 'summary']);
    expect(driverQueryKeys.history()).toEqual(['driver', 'order-history']);
    expect(driverQueryKeys.performance()).toEqual(['driver', 'performance']);
  });
});
