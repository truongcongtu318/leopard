export const UserRole = ['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN'] as const;
export type UserRole = (typeof UserRole)[number];

export const UserCapability = [
  'order.read',
  'order.create',
  'order.accept',
  'order.status_update',
  'fleet.read',
  'fleet.driver.manage',
  'user.manage',
  'system.config',
] as const;
export type UserCapability = (typeof UserCapability)[number];

export const ROLE_CAPABILITIES: Record<UserRole, readonly UserCapability[]> = {
  CUSTOMER: ['order.read', 'order.create'],
  DRIVER: ['order.read', 'order.accept', 'order.status_update'],
  FLEET_OWNER: ['order.read', 'fleet.read', 'fleet.driver.manage'],
  ADMIN: [
    'order.read',
    'order.create',
    'order.accept',
    'order.status_update',
    'fleet.read',
    'fleet.driver.manage',
    'user.manage',
    'system.config',
  ],
};

export function hasCapability(role: UserRole, capability: UserCapability): boolean {
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}
