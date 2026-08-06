import type {
  Order,
  OrderStop,
  OrderStatusHistory,
  PaymentIntent,
  User,
  DriverProfile,
  RefreshSession,
  DriverAvailability,
  OrderStatus,
  Role,
  FleetMember,
} from '@prisma/client';

export class InMemoryPrismaService {
  public users = new Map<string, User>();
  public mediaObject = {
    findFirst: jest.fn(async () => null),
  };
  public refreshSessions = new Map<string, RefreshSession>();
  public driverProfiles = new Map<string, DriverProfile>();
  public fleetMembers = new Map<string, FleetMember>();
  public orders = new Map<string, Order>();
  public orderStops = new Map<string, OrderStop & { lat: number; lng: number }>();
  public orderStatusHistories = new Map<string, OrderStatusHistory>();
  public paymentIntents = new Map<string, PaymentIntent>();

  async $transaction<T>(fn: (tx: InMemoryPrismaService) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async $queryRaw(query: TemplateStringsArray | string, ...values: unknown[]): Promise<unknown> {
    const rawSql = typeof query === 'string' ? query : query.join('?');

    if (rawSql.includes('INSERT INTO "OrderStop"')) {
      const orderId = String(values[0] ?? '');
      const type = String(values[1] ?? 'PICKUP') as any;
      const sequence = Number(values[2] ?? 0);
      const address = String(values[3] ?? '');
      const lng = Number(values[4] ?? 0);
      const lat = Number(values[5] ?? 0);
      const id = `stop-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const stop: OrderStop & { lat: number; lng: number } = {
        id,
        orderId,
        type,
        sequence,
        address,
        lat,
        lng,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      this.orderStops.set(id, stop);
      return [stop];
    }

    if (rawSql.includes('SELECT') && rawSql.includes('"OrderStop"')) {
      const orderId = String(values[0] ?? '');
      const stops = Array.from(this.orderStops.values())
        .filter((s) => s.orderId === orderId)
        .sort((a, b) => a.sequence - b.sequence);
      return stops;
    }

    return [];
  }

  async $executeRaw(_query: TemplateStringsArray | string, ..._values: unknown[]): Promise<number> {
    return 1;
  }

  user = {
    findUnique: jest.fn(async ({ where }: { where: { id?: string; phone?: string } }) => {
      if (where.id) return this.users.get(where.id) ?? null;
      if (where.phone) {
        return Array.from(this.users.values()).find((u) => u.phone === where.phone) ?? null;
      }
      return null;
    }),
    findMany: jest.fn(async ({ where }: { where?: { phone?: { in?: string[] } } } = {}) => {
      let list = Array.from(this.users.values());
      if (where?.phone?.in) {
        list = list.filter((u) => where.phone!.in!.includes(u.phone));
      }
      return list;
    }),
    create: jest.fn(async ({ data }: { data: Partial<User> }) => {
      const id = data.id ?? `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const user: User = {
        id,
        phone: data.phone ?? '',
        role: data.role ?? 'CUSTOMER',
        status: data.status ?? 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(id, user);
      return user;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<User> }) => {
      const existing = this.users.get(where.id);
      if (!existing) throw new Error('User not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      this.users.set(where.id, updated);
      return updated;
    }),
    deleteMany: jest.fn(async ({ where }: { where?: { id?: { in?: string[] } } }) => {
      let count = 0;
      if (where?.id?.in) {
        for (const id of where.id.in) {
          if (this.users.delete(id)) count++;
        }
      }
      return { count };
    }),
  };

  refreshSession = {
    findUnique: jest.fn(async ({ where }: { where: { id?: string; tokenHash?: string } }) => {
      if (where.id) return this.refreshSessions.get(where.id) ?? null;
      if (where.tokenHash) {
        return Array.from(this.refreshSessions.values()).find((s) => s.tokenHash === where.tokenHash) ?? null;
      }
      return null;
    }),
    findFirst: jest.fn(async ({ where }: { where?: any }) => {
      let list = Array.from(this.refreshSessions.values());
      if (where?.tokenHash?.startsWith) {
        list = list.filter((s) => s.tokenHash.startsWith(where.tokenHash.startsWith));
      }
      return list[0] ?? null;
    }),
    create: jest.fn(async ({ data }: { data: Partial<RefreshSession> }) => {
      const id = data.id ?? `session-${Date.now()}`;
      const session: RefreshSession = {
        id,
        userId: data.userId!,
        tokenHash: data.tokenHash!,
        expiresAt: data.expiresAt!,
        revokedAt: data.revokedAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.refreshSessions.set(id, session);
      return session;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<RefreshSession> }) => {
      const existing = this.refreshSessions.get(where.id);
      if (!existing) throw new Error('Session not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      this.refreshSessions.set(where.id, updated);
      return updated;
    }),
    updateMany: jest.fn(async ({ where, data }: { where?: any; data: Partial<RefreshSession> }) => {
      let count = 0;
      for (const session of this.refreshSessions.values()) {
        let match = true;
        if (where?.id && session.id !== where.id) match = false;
        if (where?.userId && session.userId !== where.userId) match = false;
        if (where?.revokedAt === null && session.revokedAt !== null) match = false;
        if (where?.expiresAt?.gt && session.expiresAt.getTime() <= where.expiresAt.gt.getTime()) match = false;
        if (where?.tokenHash?.contains && !session.tokenHash.includes(where.tokenHash.contains)) match = false;

        if (match) {
          Object.assign(session, data, { updatedAt: new Date() });
          count++;
        }
      }
      return { count };
    }),
    deleteMany: jest.fn(async ({ where }: { where?: { userId?: { in?: string[] } } }) => {
      let count = 0;
      if (where?.userId?.in) {
        for (const [id, session] of this.refreshSessions.entries()) {
          if (where.userId.in.includes(session.userId)) {
            this.refreshSessions.delete(id);
            count++;
          }
        }
      }
      return { count };
    }),
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      let list = Array.from(this.refreshSessions.values());
      if (where?.revokedAt === null) {
        list = list.filter((s) => s.revokedAt === null);
      }
      return list.length;
    }),
    findMany: jest.fn(async ({ where }: { where?: any } = {}) => {
      let list = Array.from(this.refreshSessions.values());
      if (where?.userId) {
        list = list.filter((s) => s.userId === where.userId);
      }
      return list;
    }),
  };

  driverProfile = {
    findUnique: jest.fn(async ({ where }: { where: { id?: string; userId?: string } }) => {
      if (where.id) return this.driverProfiles.get(where.id) ?? null;
      if (where.userId) {
        return Array.from(this.driverProfiles.values()).find((p) => p.userId === where.userId) ?? null;
      }
      return null;
    }),
    create: jest.fn(async ({ data }: { data: Partial<DriverProfile> }) => {
      const id = data.id ?? `profile-${Date.now()}`;
      const profile: DriverProfile = {
        id,
        userId: data.userId!,
        availability: data.availability ?? 'OFFLINE',
        vehicleType: data.vehicleType ?? 'MOTORBIKE',
        lastKnownAt: data.lastKnownAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.driverProfiles.set(id, profile);
      return profile;
    }),
    update: jest.fn(async ({ where, data }: { where: { id?: string; userId?: string }; data: Partial<DriverProfile> }) => {
      let existing: DriverProfile | undefined;
      if (where.id) existing = this.driverProfiles.get(where.id);
      if (where.userId) existing = Array.from(this.driverProfiles.values()).find((p) => p.userId === where.userId);
      if (!existing) throw new Error('DriverProfile not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      this.driverProfiles.set(existing.id, updated);
      return updated;
    }),
    updateMany: jest.fn(async ({ where, data }: { where?: { userId?: string; availability?: DriverAvailability }; data: Partial<DriverProfile> }) => {
      let count = 0;
      for (const profile of this.driverProfiles.values()) {
        const matchUserId = !where?.userId || profile.userId === where.userId;
        const matchAvailability = !where?.availability || profile.availability === where.availability;
        if (matchUserId && matchAvailability) {
          Object.assign(profile, data, { updatedAt: new Date() });
          count++;
        }
      }
      return { count };
    }),
  };

  fleetMember = {
    findMany: jest.fn(async ({ where, select }: { where?: any; select?: any }) => {
      let filtered = Array.from(this.fleetMembers.values());
      if (where) {
        if (where.userId) filtered = filtered.filter((m) => m.userId === where.userId);
        if (where.status) filtered = filtered.filter((m) => m.status === where.status);
        if (where.role) filtered = filtered.filter((m) => m.role === where.role);
        if (where.fleetId) {
          if (typeof where.fleetId === 'string') filtered = filtered.filter((m) => m.fleetId === where.fleetId);
          else if (where.fleetId.in) filtered = filtered.filter((m) => where.fleetId.in.includes(m.fleetId));
        }
      }
      if (select?.fleetId) {
        return filtered.map((m) => ({ fleetId: m.fleetId }));
      }
      return filtered;
    }),
    findFirst: jest.fn(async ({ where }: { where?: any }) => {
      let filtered = Array.from(this.fleetMembers.values());
      if (where) {
        if (where.userId) filtered = filtered.filter((m) => m.userId === where.userId);
        if (where.status) filtered = filtered.filter((m) => m.status === where.status);
        if (where.fleetId) {
          if (typeof where.fleetId === 'string') filtered = filtered.filter((m) => m.fleetId === where.fleetId);
          else if (where.fleetId.in) filtered = filtered.filter((m) => where.fleetId.in.includes(m.fleetId));
        }
      }
      return filtered[0] ?? null;
    }),
    count: jest.fn(async ({ where }: { where?: any }) => {
      let filtered = Array.from(this.fleetMembers.values());
      if (where) {
        if (where.userId) filtered = filtered.filter((m) => m.userId === where.userId);
        if (where.status) filtered = filtered.filter((m) => m.status === where.status);
      }
      return filtered.length;
    }),
    create: jest.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? `member-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const member: FleetMember = {
        id,
        fleetId: data.fleetId,
        userId: data.userId,
        role: data.role ?? 'DRIVER',
        status: data.status ?? 'INVITED',
        invitedAt: new Date(),
        joinedAt: data.joinedAt ?? null,
        removedAt: data.removedAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.fleetMembers.set(id, member);
      return member;
    }),
  };

  order = {
    findUnique: jest.fn(async ({ where, include }: { where: { id: string }; include?: any }) => {
      const order = this.orders.get(where.id);
      if (!order) return null;

      const stops = Array.from(this.orderStops.values()).filter((s) => s.orderId === order.id);
      const statusHistory = Array.from(this.orderStatusHistories.values()).filter((h) => h.orderId === order.id);

      if (include) {
        return {
          ...order,
          ...(include.stops ? { stops } : {}),
          ...(include.statusHistory ? { statusHistory } : {}),
        };
      }
      return order;
    }),
    findMany: jest.fn(async ({ where, skip = 0, take = 20, include }: { where?: any; skip?: number; take?: number; include?: any }) => {
      let filtered = Array.from(this.orders.values());

      if (where) {
        if (where.customerId) {
          filtered = filtered.filter((o) => o.customerId === where.customerId);
        }
        if (where.driverId) {
          filtered = filtered.filter((o) => o.driverId === where.driverId);
        }
        if (where.status) {
          if (typeof where.status === 'string') {
            filtered = filtered.filter((o) => o.status === where.status);
          } else if (where.status.in) {
            filtered = filtered.filter((o) => where.status.in.includes(o.status));
          }
        }
      }

      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const pageItems = filtered.slice(skip, skip + take);

      if (include) {
        return pageItems.map((order) => {
          const stops = Array.from(this.orderStops.values()).filter((s) => s.orderId === order.id);
          const statusHistory = Array.from(this.orderStatusHistories.values()).filter((h) => h.orderId === order.id);
          return {
            ...order,
            ...(include.stops ? { stops } : {}),
            ...(include.statusHistory ? { statusHistory } : {}),
          };
        });
      }

      return pageItems;
    }),
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      let filtered = Array.from(this.orders.values());
      if (where) {
        if (where.customerId) filtered = filtered.filter((o) => o.customerId === where.customerId);
        if (where.driverId) filtered = filtered.filter((o) => o.driverId === where.driverId);
        if (where.status) {
          if (typeof where.status === 'string') {
            filtered = filtered.filter((o) => o.status === where.status);
          } else if (where.status.in) {
            filtered = filtered.filter((o) => where.status.in.includes(o.status));
          }
        }
      }
      return filtered.length;
    }),
    findFirst: jest.fn(async ({ where }: { where?: any }) => {
      let filtered = Array.from(this.orders.values());
      if (where) {
        if (where.customerId) filtered = filtered.filter((o) => o.customerId === where.customerId);
        if (where.clientRequestId) filtered = filtered.filter((o: any) => o.clientRequestId === where.clientRequestId);
      }
      return filtered[0] ?? null;
    }),
    create: jest.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const order: any = {
        id,
        customerId: data.customerId,
        clientRequestId: data.clientRequestId ?? null,
        driverId: data.driverId ?? null,
        status: data.status ?? 'REQUESTED',
        routeSnapshot: data.routeSnapshot ?? null,
        providerSource: data.providerSource ?? null,
        distanceMeters: data.distanceMeters ?? null,
        durationSeconds: data.durationSeconds ?? null,
        priceVnd: data.priceVnd ?? null,
        etaSeconds: data.etaSeconds ?? null,
        acceptedAt: data.acceptedAt ?? null,
        pickingUpAt: data.pickingUpAt ?? null,
        inTransitAt: data.inTransitAt ?? null,
        deliveredAt: data.deliveredAt ?? null,
        cancelledAt: data.cancelledAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.orders.set(id, order);

      if (data.statusHistory?.create) {
        const shData = data.statusHistory.create;
        const historyId = `sh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const history: OrderStatusHistory = {
          id: historyId,
          orderId: id,
          fromStatus: shData.fromStatus ?? null,
          toStatus: shData.toStatus,
          actorId: shData.actorId ?? null,
          reason: shData.reason ?? null,
          createdAt: new Date(),
        };
        this.orderStatusHistories.set(historyId, history);
      }

      return order;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
      const existing = this.orders.get(where.id);
      if (!existing) throw new Error('Order not found');
      const updated: Order = { ...existing, ...data, updatedAt: new Date() };
      this.orders.set(where.id, updated);
      return updated;
    }),
    updateMany: jest.fn(async ({ where, data }: { where: { id: string; status: OrderStatus }; data: any }) => {
      const existing = this.orders.get(where.id);
      if (!existing || existing.status !== where.status) {
        return { count: 0 };
      }
      const updated: Order = { ...existing, ...data, updatedAt: new Date() };
      this.orders.set(where.id, updated);
      return { count: 1 };
    }),
  };

  orderStatusHistory = {
    create: jest.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? `sh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const history: OrderStatusHistory = {
        id,
        orderId: data.orderId,
        fromStatus: data.fromStatus ?? null,
        toStatus: data.toStatus,
        actorId: data.actorId ?? null,
        reason: data.reason ?? null,
        createdAt: new Date(),
      };
      this.orderStatusHistories.set(id, history);
      return history;
    }),
    findMany: jest.fn(async ({ where }: { where: { orderId: string } }) => {
      return Array.from(this.orderStatusHistories.values())
        .filter((h) => h.orderId === where.orderId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }),
  };
}
