export const customerQueryKeys = {
  all: ['customer'] as const,
  orders: () => [...customerQueryKeys.all, 'orders'] as const,
  orderList: (filter?: string) =>
    filter
      ? ([...customerQueryKeys.orders(), { filter }] as const)
      : ([...customerQueryKeys.orders()] as const),
  orderDetail: (orderId: string) => [...customerQueryKeys.all, 'order', orderId] as const,
  wallet: () => [...customerQueryKeys.all, 'wallet'] as const,
  profile: () => [...customerQueryKeys.all, 'profile'] as const,
  notifications: () => [...customerQueryKeys.all, 'notifications'] as const,
};

export const driverQueryKeys = {
  all: ['driver'] as const,
  orders: () => [...driverQueryKeys.all, 'orders'] as const,
  orderDetail: (orderId: string) => [...driverQueryKeys.all, 'order', orderId] as const,
  routeEta: (orderId: string) => [...driverQueryKeys.orderDetail(orderId), 'route-eta'] as const,
  profile: () => [...driverQueryKeys.all, 'profile'] as const,
  wallet: () => [...driverQueryKeys.all, 'wallet'] as const,
  walletSummary: () => [...driverQueryKeys.wallet(), 'summary'] as const,
  history: () => [...driverQueryKeys.all, 'order-history'] as const,
  performance: () => [...driverQueryKeys.all, 'performance'] as const,
};
