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
  AuditLog,
  Notification,
  DeviceToken,
  Invoice,
  InvoiceSequence,
  WithdrawalRequest,
  WithdrawalStatus,
  SupportTicket,
  SupportTicketStatus,
  OrderReview,
} from '@prisma/client';
import { createNotificationMock, createDeviceTokenMock } from './prisma-mock-notifications';
import { createInvoiceMock, createInvoiceSequenceMock } from './prisma-mock-invoices';

/** Approximate great-circle distance in meters — good enough for the mock's
 * radius-filter tests; production uses PostGIS ST_Distance/ST_DWithin. */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const EARTH_RADIUS_M = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export class InMemoryPrismaService {
  public users = new Map<string, User>();
  public refreshSessions = new Map<string, RefreshSession>();
  public driverProfiles = new Map<string, DriverProfile>();
  public fleetMembers = new Map<string, FleetMember>();
  public fleets = new Map<string, any>();
  public orders = new Map<string, Order>();
  public orderStops = new Map<string, OrderStop & { lat: number; lng: number }>();
  public driverLocations = new Map<string, { lat: number; lng: number }>();
  public orderStatusHistories = new Map<string, OrderStatusHistory>();
  public paymentIntents = new Map<string, PaymentIntent>();
  public mediaObjects = new Map<string, any>();
  public auditLogs = new Map<string, AuditLog>();
  public notifications = new Map<string, Notification>();
  public deviceTokens = new Map<string, DeviceToken>();
  public invoices = new Map<string, Invoice>();
  public invoiceSequences = new Map<number, InvoiceSequence>();
  public withdrawalRequests = new Map<string, WithdrawalRequest>();
  public supportTickets = new Map<string, SupportTicket>();
  public orderReviews = new Map<string, OrderReview>();
  public orderMessages = new Map<string, any>();
  private _auditSeq = 0;

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
        contactName: (values[6] as string) ?? null,
        contactPhone: (values[7] as string) ?? null,
        note: (values[8] as string) ?? null,
        lat,
        lng,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      this.orderStops.set(id, stop);
      return [stop];
    }

    // Radius-ranked pickup-distance query (JOIN "Order" + "OrderStop") — must
    // be checked before the generic "SELECT ... OrderStop" branch below,
    // since it also contains that substring.
    if (rawSql.includes('JOIN "OrderStop"')) {
      const lng = Number(values[0]);
      const lat = Number(values[1]);
      const vehicleType = values[2] != null ? String(values[2]) : null;
      const radiusM = Number(values[values.length - 1]);

      const results: Array<{ orderId: string; distance_m: number }> = [];
      for (const order of this.orders.values()) {
        if (order.status !== 'REQUESTED') continue;
        if (vehicleType && (order as { vehicleType?: string }).vehicleType !== vehicleType) continue;
        const pickup = Array.from(this.orderStops.values()).find(
          (s) => s.orderId === order.id && s.type === 'PICKUP',
        );
        if (!pickup) continue;
        const distanceM = haversineMeters(lat, lng, pickup.lat, pickup.lng);
        if (distanceM <= radiusM) {
          results.push({ orderId: order.id, distance_m: distanceM });
        }
      }
      results.sort((a, b) => a.distance_m - b.distance_m);
      return results;
    }

    // Batched stop lookup for a page of orders: `"orderId" = ANY($1::uuid[])`.
    if (rawSql.includes('ANY(') && rawSql.includes('"OrderStop"')) {
      const orderIds = Array.isArray(values[0]) ? (values[0] as string[]) : [String(values[0] ?? '')];
      const stops = Array.from(this.orderStops.values())
        .filter((s) => orderIds.includes(s.orderId))
        .sort((a, b) => a.sequence - b.sequence);
      return stops;
    }

    if (rawSql.includes('SELECT') && rawSql.includes('"OrderStop"')) {
      const orderId = String(values[0] ?? '');
      const stops = Array.from(this.orderStops.values())
        .filter((s) => s.orderId === orderId)
        .sort((a, b) => a.sequence - b.sequence);
      return stops;
    }

    if (rawSql.includes('UPDATE "DriverProfile"') && rawSql.includes('lastKnownLocation')) {
      const lng = Number(values[0]);
      const lat = Number(values[1]);
      const userId = String(values[2] ?? '');
      this.driverLocations.set(userId, { lat, lng });
      return [];
    }

    if (rawSql.includes('FROM "DriverProfile"') && rawSql.includes('lastKnownLocation')) {
      const userId = String(values[0] ?? '');
      const location = this.driverLocations.get(userId);
      return location ? [location] : [];
    }

    return [];
  }

  async $executeRaw(_query: TemplateStringsArray | string, ..._values: unknown[]): Promise<number> {
    return 1;
  }

  user = {
    findUnique: jest.fn(
      async ({
        where,
        include,
      }: {
        where: { id?: string; phone?: string };
        include?: { driverProfile?: boolean };
      }) => {
        let user: User | null = null;
        if (where.id) user = this.users.get(where.id) ?? null;
        else if (where.phone) {
          user = Array.from(this.users.values()).find((u) => u.phone === where.phone) ?? null;
        }
        if (!user) return null;
        if (include?.driverProfile) {
          const driverProfile =
            Array.from(this.driverProfiles.values()).find((p) => p.userId === user!.id) ?? null;
          return { ...user, driverProfile };
        }
        return user;
      },
    ),
    findMany: jest.fn(
      async ({
        where,
        skip,
        take,
        orderBy,
      }: { where?: any; skip?: number; take?: number; orderBy?: any } = {}) => {
        let list = Array.from(this.users.values());
        if (where?.phone?.in) {
          list = list.filter((u) => where.phone!.in!.includes(u.phone));
        }
        if (where?.role) {
          list = list.filter((u) => u.role === where.role);
        }
        if (where?.status) {
          list = list.filter((u) => u.status === where.status);
        }
        if (orderBy?.createdAt === 'desc') {
          list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        if (skip) list = list.slice(skip);
        if (take !== undefined) list = list.slice(0, take);
        return list;
      },
    ),
    create: jest.fn(async ({ data }: { data: Partial<User> }) => {
      const id = data.id ?? `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const user: User = {
        id,
        name: data.name ?? null,
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
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      let list = Array.from(this.users.values());
      if (where?.role) list = list.filter((u) => u.role === where.role);
      if (where?.status) list = list.filter((u) => u.status === where.status);
      return list.length;
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
      const id = data.id ?? `profile-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
    findMany: jest.fn(async ({ where, include }: { where?: any; include?: any } = {}) => {
      let list = Array.from(this.driverProfiles.values());
      if (where) {
        if (where.availability) list = list.filter((p) => p.availability === where.availability);
        if (where.vehicleType) list = list.filter((p) => p.vehicleType === where.vehicleType);
        if (where.user) {
          list = list.filter((p) => {
            const user = this.users.get(p.userId);
            if (!user) return false;
            if (where.user.status && user.status !== where.user.status) return false;
            if (where.user.role && user.role !== where.user.role) return false;
            return true;
          });
        }
      }
      return list.map((p) => {
        const item: any = { ...p };
        if (include?.user) {
          item.user = this.users.get(p.userId) ?? null;
        }
        return item;
      });
    }),
    // Driver-contract onboarding flow (`DriverApplicationService.commitApplication`)
    // upserts by `userId` — one profile per user, created on first apply.
    upsert: jest.fn(
      async ({
        where,
        create,
        update,
      }: {
        where: { userId: string };
        create: Partial<DriverProfile> & { userId: string };
        update: Partial<DriverProfile>;
      }) => {
        const existing = Array.from(this.driverProfiles.values()).find(
          (p) => p.userId === where.userId,
        );
        if (existing) {
          const updated = { ...existing, ...update, updatedAt: new Date() } as DriverProfile;
          this.driverProfiles.set(existing.id, updated);
          return updated;
        }
        const id = create.id ?? `profile-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const profile = {
          id,
          userId: create.userId,
          availability: create.availability ?? 'OFFLINE',
          vehicleType: create.vehicleType ?? 'MOTORBIKE',
          licensePlate: create.licensePlate ?? null,
          licenseNumber: create.licenseNumber ?? null,
          submittedAt: create.submittedAt ?? null,
          reviewedAt: create.reviewedAt ?? null,
          reviewedById: create.reviewedById ?? null,
          rejectionReason: create.rejectionReason ?? null,
          contractVersion: create.contractVersion ?? null,
          contractSignedAt: create.contractSignedAt ?? null,
          lastKnownAt: create.lastKnownAt ?? null,
          autoOfflineOnComplete: create.autoOfflineOnComplete ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as DriverProfile;
        this.driverProfiles.set(id, profile);
        return profile;
      },
    ),
  };

  public driverContracts = new Map<string, any>();

  // `DriverContractService.persistSignedContract`/`getSignedContractForAdmin`
  // only ever look a contract up by its `driverProfileId_version` compound
  // unique key — mirrors the real Prisma `@@unique([driverProfileId, version])`.
  driverContract = {
    findUnique: jest.fn(
      async ({
        where,
      }: {
        where: { driverProfileId_version: { driverProfileId: string; version: string } };
      }) => {
        const { driverProfileId, version } = where.driverProfileId_version;
        return (
          Array.from(this.driverContracts.values()).find(
            (c) => c.driverProfileId === driverProfileId && c.version === version,
          ) ?? null
        );
      },
    ),
    upsert: jest.fn(
      async ({
        where,
        create,
        update,
      }: {
        where: { driverProfileId_version: { driverProfileId: string; version: string } };
        create: Record<string, unknown> & { driverProfileId: string; version: string };
        update: Record<string, unknown>;
      }) => {
        const { driverProfileId, version } = where.driverProfileId_version;
        const key = `${driverProfileId}::${version}`;
        const existing = this.driverContracts.get(key);
        if (existing) {
          const updated = { ...existing, ...update };
          this.driverContracts.set(key, updated);
          return updated;
        }
        const record = {
          id: `contract-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          ipAddress: null,
          createdAt: new Date(),
          ...create,
        };
        this.driverContracts.set(key, record);
        return record;
      },
    ),
  };

  fleet = {
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
      return this.fleets.get(where.id) ?? null;
    }),
    findMany: jest.fn(async ({ include }: { include?: any } = {}) => {
      const list = Array.from(this.fleets.values());
      if (include?._count?.select?.memberships) {
        const where = include._count.select.memberships.where;
        return list.map((f) => {
          const count = Array.from(this.fleetMembers.values()).filter(
            (m) =>
              m.fleetId === f.id &&
              (!where?.role || m.role === where.role) &&
              (!where?.status || m.status === where.status),
          ).length;
          return {
            ...f,
            _count: { memberships: count },
          };
        });
      }
      return list;
    }),
    count: jest.fn(async () => {
      return this.fleets.size;
    }),
    create: jest.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? `fleet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const fleet = { id, ...data, createdAt: new Date() };
      this.fleets.set(id, fleet);
      return fleet;
    }),
  };

  fleetMember = {
    findMany: jest.fn(async ({ where, select, include }: { where?: any; select?: any; include?: any } = {}) => {
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
      if (include?.user) {
        return filtered.map((m) => {
          const user = this.users.get(m.userId);
          const driverProfile = Array.from(this.driverProfiles.values()).find((p) => p.userId === m.userId) ?? null;
          return {
            ...m,
            user: user ? { ...user, driverProfile } : null,
          };
        });
      }
      return filtered;
    }),
    findFirst: jest.fn(async ({ where }: { where?: any } = {}) => {
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
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      let filtered = Array.from(this.fleetMembers.values());
      if (where) {
        if (where.userId) filtered = filtered.filter((m) => m.userId === where.userId);
        if (where.status) filtered = filtered.filter((m) => m.status === where.status);
        if (where.fleetId) filtered = filtered.filter((m) => m.fleetId === where.fleetId);
        if (where.role) filtered = filtered.filter((m) => m.role === where.role);
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

  private filterOrders(where?: any): Order[] {
    let list = Array.from(this.orders.values());
    if (!where) return list;

    const matchesCondition = (o: Order, cond: any): boolean => {
      if (cond.id && typeof cond.id === 'string' && o.id !== cond.id) return false;
      if (cond.id?.in && !cond.id.in.includes(o.id)) return false;
      if (cond.customerId && o.customerId !== cond.customerId) return false;
      if ('driverId' in cond) {
        if (cond.driverId === null && o.driverId !== null) return false;
        if (cond.driverId !== null && o.driverId !== cond.driverId) return false;
      }
      if (cond.status) {
        if (typeof cond.status === 'string' && o.status !== cond.status) return false;
        if (cond.status.in && !cond.status.in.includes(o.status)) return false;
      }
      if (cond.vehicleType && o.vehicleType !== cond.vehicleType) return false;
      if (cond.createdAt) {
        if (cond.createdAt.gte && o.createdAt < cond.createdAt.gte) return false;
        if (cond.createdAt.lte && o.createdAt > cond.createdAt.lte) return false;
      }
      if (cond.customer?.name?.contains) {
        const customer = this.users.get(o.customerId);
        if (!customer?.name?.toLowerCase().includes(cond.customer.name.contains.toLowerCase())) return false;
      }
      if (cond.customer?.phone?.contains) {
        const customer = this.users.get(o.customerId);
        if (!customer?.phone?.toLowerCase().includes(cond.customer.phone.contains.toLowerCase())) return false;
      }
      if (cond.stops?.some?.address?.contains) {
        const stops = Array.from(this.orderStops.values()).filter((s) => s.orderId === o.id);
        const needle = cond.stops.some.address.contains.toLowerCase();
        if (!stops.some((s) => s.address.toLowerCase().includes(needle))) return false;
      }
      if (cond.clientRequestId?.contains) {
        const needle = cond.clientRequestId.contains.toLowerCase();
        if (!o.clientRequestId?.toLowerCase().includes(needle)) return false;
      }
      if (cond.driver?.fleetMemberships?.some) {
        const { fleetId, role, status } = cond.driver.fleetMemberships.some;
        if (!o.driverId) return false;
        const matched = Array.from(this.fleetMembers.values()).some(
          (m) =>
            m.userId === o.driverId &&
            (!fleetId || m.fleetId === fleetId) &&
            (!role || m.role === role) &&
            (!status || m.status === status),
        );
        if (!matched) return false;
      }
      if (cond.AND && Array.isArray(cond.AND)) {
        if (!cond.AND.every((c: any) => matchesCondition(o, c))) return false;
      }
      if (cond.OR && Array.isArray(cond.OR)) {
        if (!cond.OR.some((c: any) => matchesCondition(o, c))) return false;
      }
      return true;
    };

    return list.filter((o) => matchesCondition(o, where));
  }

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
    findMany: jest.fn(async ({ where, skip = 0, take = 20, include, orderBy }: { where?: any; skip?: number; take?: number; include?: any; orderBy?: any } = {}) => {
      let filtered = this.filterOrders(where);

      if (orderBy?.createdAt === 'asc') {
        filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      } else {
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      const pageItems = where?.id?.in ? filtered : (take !== undefined ? filtered.slice(skip, skip + take) : filtered.slice(skip));

      if (include) {
        return pageItems.map((order) => {
          const stops = Array.from(this.orderStops.values()).filter((s) => s.orderId === order.id).sort((a, b) => a.sequence - b.sequence);
          const statusHistory = Array.from(this.orderStatusHistories.values()).filter((h) => h.orderId === order.id);
          const driver = order.driverId ? this.users.get(order.driverId) ?? null : null;
          const customer = order.customerId ? this.users.get(order.customerId) ?? null : null;
          const orderMessages = Array.from(this.orderMessages.values())
            .filter((m) => m.orderId === order.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return {
            ...order,
            ...(include.driver ? { driver } : {}),
            ...(include.customer ? { customer } : {}),
            ...(include.orderMessages ? { orderMessages } : {}),
            ...(include.messages ? { messages: orderMessages } : {}),
            ...(include.stops ? { stops } : {}),
            ...(include.statusHistory ? { statusHistory } : {}),
          };
        });
      }

      return pageItems;
    }),
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      return this.filterOrders(where).length;
    }),
    aggregate: jest.fn(async () => {
      return { _sum: { priceVnd: 0 } };
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
        vehicleType: data.vehicleType ?? 'MOTORBIKE',
        cargoWeightKg: data.cargoWeightKg ?? null,
        cargoNote: data.cargoNote ?? null,
        proofMediaId: data.proofMediaId ?? null,
        incidentReason: data.incidentReason ?? null,
        incidentNote: data.incidentNote ?? null,
        incidentReportedAt: data.incidentReportedAt ?? null,
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
          clientRequestId: shData.clientRequestId ?? null,
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
    updateMany: jest.fn(async ({ where, data }: { where: { id: string; driverId?: string; status: OrderStatus }; data: any }) => {
      const existing = this.orders.get(where.id);
      if (!existing || existing.status !== where.status || (where.driverId && existing.driverId !== where.driverId)) {
        return { count: 0 };
      }
      const updated: Order = { ...existing, ...data, updatedAt: new Date() };
      this.orders.set(where.id, updated);
      return { count: 1 };
    }),
  };

  orderStatusHistory = {
    findFirst: jest.fn(async ({ where }: { where?: any }) => {
      let histories = Array.from(this.orderStatusHistories.values());
      if (where?.orderId) {
        histories = histories.filter((history) => history.orderId === where.orderId);
      }
      if (where?.actorId) {
        histories = histories.filter((history) => history.actorId === where.actorId);
      }
      if (where?.clientRequestId) {
        histories = histories.filter((history: any) => history.clientRequestId === where.clientRequestId);
      }
      return histories[0] ?? null;
    }),
    create: jest.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? `sh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const history: OrderStatusHistory = {
        id,
        orderId: data.orderId,
        fromStatus: data.fromStatus ?? null,
        toStatus: data.toStatus,
        actorId: data.actorId ?? null,
        clientRequestId: data.clientRequestId ?? null,
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

  mediaObject = {
    findFirst: jest.fn(async ({ where }: { where?: any }) => {
      let list = Array.from(this.mediaObjects.values());
      if (where?.orderId) list = list.filter((m) => m.orderId === where.orderId);
      if (where?.uploaderId) list = list.filter((m) => m.uploaderId === where.uploaderId);
      if (where?.type) list = list.filter((m) => m.type === where.type);
      if (where?.clientRequestId) list = list.filter((m) => m.clientRequestId === where.clientRequestId);
      return list[0] ?? null;
    }),
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
      return this.mediaObjects.get(where.id) ?? null;
    }),
    create: jest.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? `media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const media = { id, ...data, createdAt: new Date() };
      this.mediaObjects.set(id, media);
      return media;
    }),
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      let list = Array.from(this.mediaObjects.values());
      if (where?.orderId) list = list.filter((m) => m.orderId === where.orderId);
      if (where?.type) list = list.filter((m) => m.type === where.type);
      return list.length;
    }),
    findMany: jest.fn(async ({ where }: { where?: any } = {}) => {
      let list = Array.from(this.mediaObjects.values());
      if (where?.orderId) list = list.filter((m) => m.orderId === where.orderId);
      return list;
    }),
  };

  paymentIntent = {
    findFirst: jest.fn(async ({ where }: { where?: any }) => {
      let list = Array.from(this.paymentIntents.values());
      if (where?.orderId) list = list.filter((p) => p.orderId === where.orderId);
      if (where?.clientRequestId) list = list.filter((p) => p.clientRequestId === where.clientRequestId);
      if (where?.confirmationRequestId) list = list.filter((p) => (p as any).confirmationRequestId === where.confirmationRequestId);
      if (where?.status?.in) list = list.filter((p) => where.status.in.includes(p.status));
      return list[0] ?? null;
    }),
    findUnique: jest.fn(async ({ where }: { where: { id?: string; payosOrderCode?: bigint } }) => {
      if (where.id) return this.paymentIntents.get(where.id) ?? null;
      if (where.payosOrderCode !== undefined) {
        return Array.from(this.paymentIntents.values()).find(
          (p) => p.payosOrderCode === where.payosOrderCode,
        ) ?? null;
      }
      return null;
    }),
    create: jest.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? `payment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const payment: PaymentIntent = {
        id,
        orderId: data.orderId,
        provider: data.provider ?? null,
        status: data.status ?? 'UNPAID',
        amountVnd: data.amountVnd,
        clientRequestId: data.clientRequestId ?? null,
        providerReference: data.providerReference ?? null,
        payosOrderCode: data.payosOrderCode ?? null,
        qrPayload: data.qrPayload ?? null,
        providerSnapshot: data.providerSnapshot ?? null,
        expiresAt: data.expiresAt ?? null,
        confirmedById: data.confirmedById ?? null,
        confirmedAt: data.confirmedAt ?? null,
        confirmationNote: data.confirmationNote ?? null,
        confirmationRequestId: data.confirmationRequestId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.paymentIntents.set(id, payment);
      return payment;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
      const existing = this.paymentIntents.get(where.id);
      if (!existing) throw new Error('Payment not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      this.paymentIntents.set(where.id, updated);
      return updated;
    }),
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      let list = Array.from(this.paymentIntents.values());
      if (where?.status) list = list.filter((p) => p.status === where.status);
      if (where?.provider) list = list.filter((p) => p.provider === where.provider);
      if (where?.orderId) list = list.filter((p) => p.orderId === where.orderId);
      if (where?.createdAt?.gte) list = list.filter((p) => p.createdAt >= where.createdAt.gte);
      if (where?.createdAt?.lte) list = list.filter((p) => p.createdAt <= where.createdAt.lte);
      return list.length;
    }),
    findMany: jest.fn(
      async ({
        where,
        skip = 0,
        take,
        include,
        orderBy,
      }: { where?: any; skip?: number; take?: number; include?: any; orderBy?: any } = {}) => {
        let list = Array.from(this.paymentIntents.values());
        if (where?.status) list = list.filter((p) => p.status === where.status);
        if (where?.provider) list = list.filter((p) => p.provider === where.provider);
        if (where?.orderId) list = list.filter((p) => p.orderId === where.orderId);
        if (where?.createdAt?.gte) list = list.filter((p) => p.createdAt >= where.createdAt.gte);
        if (where?.createdAt?.lte) list = list.filter((p) => p.createdAt <= where.createdAt.lte);

        if (orderBy?.createdAt === 'desc') {
          list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        if (skip) list = list.slice(skip);
        if (take !== undefined) list = list.slice(0, take);

        return list.map((p) => {
          const item: any = { ...p };
          if (include?.order) {
            const order = this.orders.get(p.orderId);
            item.order = order ? { ...order } : null;
            if (item.order && include.order?.include?.customer) {
              const customer = order?.customerId ? this.users.get(order.customerId) : null;
              item.order.customer = customer
                ? { id: customer.id, name: customer.name, phone: customer.phone }
                : null;
            }
          }
          if (include?.confirmedBy) {
            const confirmer = p.confirmedById ? this.users.get(p.confirmedById) : null;
            item.confirmedBy = confirmer
              ? { id: confirmer.id, name: confirmer.name, phone: confirmer.phone }
              : null;
          }
          return item;
        });
      },
    ),
  };

  auditLog = {
    findFirst: jest.fn(
      async ({
        where,
        orderBy,
        include,
      }: { where?: any; orderBy?: any; include?: any } = {}) => {
        let list = Array.from(this.auditLogs.values());
        if (where?.idempotencyRequestId) {
          list = list.filter((a: any) => a.idempotencyRequestId === where.idempotencyRequestId);
        }
        if (where?.actorId) list = list.filter((a) => a.actorId === where.actorId);
        if (where?.action) list = list.filter((a) => a.action === where.action);
        if (where?.resourceType) list = list.filter((a) => a.resourceType === where.resourceType);
        if (where?.resourceId) list = list.filter((a) => a.resourceId === where.resourceId);

        if (orderBy?.createdAt === 'desc') {
          list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } else if (orderBy?.createdAt === 'asc') {
          list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }

        const found = list[0];
        if (!found) return null;

        const item: any = { ...found };
        if (include?.actor) {
          const actor = found.actorId ? this.users.get(found.actorId) : null;
          item.actor = actor
            ? { id: actor.id, name: actor.name, phone: actor.phone, role: actor.role }
            : null;
        }
        return item;
      },
    ),
    create: jest.fn(async ({ data }: { data: Partial<AuditLog> }) => {
      const id = data.id ?? `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const audit: AuditLog = {
        id,
        actorId: data.actorId ?? null,
        action: data.action ?? '',
        resourceType: data.resourceType ?? '',
        resourceId: data.resourceId ?? null,
        requestId: (data as any).requestId ?? null,
        idempotencyRequestId: (data as any).idempotencyRequestId ?? null,
        metadata: data.metadata ?? null,
        createdAt: (data as any).createdAt ?? new Date(Date.now() + (++this._auditSeq)),
      };
      this.auditLogs.set(id, audit);
      return audit;
    }),
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      let list = Array.from(this.auditLogs.values());
      if (where?.actorId) list = list.filter((a) => a.actorId === where.actorId);
      if (where?.action) list = list.filter((a) => a.action === where.action);
      if (where?.resourceType) list = list.filter((a) => a.resourceType === where.resourceType);
      if (where?.resourceId) list = list.filter((a) => a.resourceId === where.resourceId);
      if (where?.createdAt?.gte) list = list.filter((a) => a.createdAt >= where.createdAt.gte);
      if (where?.createdAt?.lte) list = list.filter((a) => a.createdAt <= where.createdAt.lte);
      return list.length;
    }),
    findMany: jest.fn(
      async ({
        where,
        skip = 0,
        take,
        include,
        orderBy,
      }: { where?: any; skip?: number; take?: number; include?: any; orderBy?: any } = {}) => {
        let list = Array.from(this.auditLogs.values());
        if (where?.actorId) list = list.filter((a) => a.actorId === where.actorId);
        if (where?.action) list = list.filter((a) => a.action === where.action);
        if (where?.resourceType) list = list.filter((a) => a.resourceType === where.resourceType);
        if (where?.resourceId) list = list.filter((a) => a.resourceId === where.resourceId);
        if (where?.createdAt?.gte) list = list.filter((a) => a.createdAt >= where.createdAt.gte);
        if (where?.createdAt?.lte) list = list.filter((a) => a.createdAt <= where.createdAt.lte);

        if (orderBy?.createdAt === 'desc') {
          list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        if (skip) list = list.slice(skip);
        if (take !== undefined) list = list.slice(0, take);

        return list.map((a) => {
          const item: any = { ...a };
          if (include?.actor) {
            const actor = a.actorId ? this.users.get(a.actorId) : null;
            item.actor = actor
              ? { id: actor.id, name: actor.name, phone: actor.phone, role: actor.role }
              : null;
          }
          return item;
        });
      },
    ),
    deleteMany: jest.fn(async () => {
      this.auditLogs.clear();
    }),
  };

  notification = createNotificationMock(this.notifications);

  deviceToken = createDeviceTokenMock(this.deviceTokens);

  invoice = createInvoiceMock(this.invoices, this.orders);

  invoiceSequence = createInvoiceSequenceMock(this.invoiceSequences);

  promotionVouchers = new Map<string, any>();

  promotionVoucher = {
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      let list = Array.from(this.promotionVouchers.values());
      if (where?.isActive !== undefined) list = list.filter((v) => v.isActive === where.isActive);
      if (where?.discountType) list = list.filter((v) => v.discountType === where.discountType);
      if (where?.OR) {
        list = list.filter((v) =>
          where.OR.some((cond: any) => {
            if (cond.code?.contains) {
              return v.code.toLowerCase().includes(cond.code.contains.toLowerCase());
            }
            if (cond.title?.contains) {
              return v.title.toLowerCase().includes(cond.title.contains.toLowerCase());
            }
            return false;
          }),
        );
      }
      return list.length;
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      if (where?.id) {
        return Array.from(this.promotionVouchers.values()).find((v) => v.id === where.id) ?? null;
      }
      if (where?.code) {
        return Array.from(this.promotionVouchers.values()).find((v) => v.code === where.code) ?? null;
      }
      return null;
    }),
    create: jest.fn(async ({ data }: any) => {
      const id = data.id ?? `voucher-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const now = data.createdAt ?? new Date();
      const voucher = {
        id,
        code: data.code,
        title: data.title,
        description: data.description ?? null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxDiscountVnd: data.maxDiscountVnd ?? null,
        minOrderAmountVnd: data.minOrderAmountVnd ?? 0,
        usageLimit: data.usageLimit ?? null,
        usageCount: data.usageCount ?? 0,
        expiresAt: data.expiresAt ?? null,
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: data.updatedAt ?? now,
      };
      this.promotionVouchers.set(id, voucher);
      return voucher;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const voucher = Array.from(this.promotionVouchers.values()).find(
        (v) => (where.id && v.id === where.id) || (where.code && v.code === where.code),
      );
      if (!voucher) throw new Error('PromotionVoucher not found');
      const updated = {
        ...voucher,
        ...data,
        updatedAt: new Date(),
      };
      this.promotionVouchers.set(voucher.id, updated);
      return updated;
    }),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const existing = Array.from(this.promotionVouchers.values()).find(
        (v) => (where.id && v.id === where.id) || (where.code && v.code === where.code),
      );
      if (existing) {
        const updated = { ...existing, ...update, updatedAt: new Date() };
        this.promotionVouchers.set(existing.id, updated);
        return updated;
      }
      const id = create.id ?? `voucher-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const now = new Date();
      const created = {
        id,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
        ...create,
      };
      this.promotionVouchers.set(id, created);
      return created;
    }),
    findMany: jest.fn(
      async ({
        where,
        skip = 0,
        take,
        orderBy,
      }: { where?: any; skip?: number; take?: number; orderBy?: any } = {}) => {
        let list = Array.from(this.promotionVouchers.values());
        if (where?.isActive !== undefined) list = list.filter((v) => v.isActive === where.isActive);
        if (where?.discountType) list = list.filter((v) => v.discountType === where.discountType);
        if (where?.OR) {
          list = list.filter((v) =>
            where.OR.some((cond: any) => {
              if (cond.code?.contains) {
                return v.code.toLowerCase().includes(cond.code.contains.toLowerCase());
              }
              if (cond.title?.contains) {
                return v.title.toLowerCase().includes(cond.title.contains.toLowerCase());
              }
              return false;
            }),
          );
        }

        if (orderBy?.createdAt === 'desc') {
          list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        if (skip) list = list.slice(skip);
        if (take !== undefined) list = list.slice(0, take);
        return list;
      },
    ),
  };

  withdrawalRequest = {
    create: jest.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? `wr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const now = new Date(Date.now() + (this.withdrawalRequests.size + 1) * 10);
      const request: WithdrawalRequest = {
        id,
        driverId: data.driverId,
        amountVnd: data.amountVnd,
        status: (data.status ?? 'PENDING') as WithdrawalStatus,
        bankName: data.bankName ?? null,
        bankAccountNumber: data.bankAccountNumber ?? null,
        bankAccountName: data.bankAccountName ?? null,
        clientRequestId: data.clientRequestId ?? null,
        reviewedById: data.reviewedById ?? null,
        reviewedAt: data.reviewedAt ?? null,
        reviewNote: data.reviewNote ?? null,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      };
      this.withdrawalRequests.set(id, request);
      return request;
    }),
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
      return this.withdrawalRequests.get(where.id) ?? null;
    }),
    findFirst: jest.fn(async ({ where }: { where?: any }) => {
      let list = Array.from(this.withdrawalRequests.values());
      if (where?.driverId) list = list.filter((r) => r.driverId === where.driverId);
      if (where?.clientRequestId) list = list.filter((r) => r.clientRequestId === where.clientRequestId);
      if (where?.status) {
        if (typeof where.status === 'string') list = list.filter((r) => r.status === where.status);
        else if (where.status.in) list = list.filter((r) => where.status.in.includes(r.status));
      }
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return list[0] ?? null;
    }),
    findMany: jest.fn(async ({ where, skip = 0, take }: { where?: any; skip?: number; take?: number } = {}) => {
      let list = Array.from(this.withdrawalRequests.values());
      if (where?.driverId) list = list.filter((r) => r.driverId === where.driverId);
      if (where?.status) {
        if (typeof where.status === 'string') list = list.filter((r) => r.status === where.status);
        else if (where.status.in) list = list.filter((r) => where.status.in.includes(r.status));
      }
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const sliced = take !== undefined ? list.slice(skip, skip + take) : list.slice(skip);
      return sliced;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<WithdrawalRequest> }) => {
      const existing = this.withdrawalRequests.get(where.id);
      if (!existing) throw new Error('WithdrawalRequest not found');
      const updated = { ...existing, ...data, updatedAt: new Date() } as WithdrawalRequest;
      this.withdrawalRequests.set(where.id, updated);
      return updated;
    }),
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      let list = Array.from(this.withdrawalRequests.values());
      if (where?.driverId) list = list.filter((r) => r.driverId === where.driverId);
      if (where?.status) {
        if (typeof where.status === 'string') list = list.filter((r) => r.status === where.status);
        else if (where.status.in) list = list.filter((r) => where.status.in.includes(r.status));
      }
      return list.length;
    }),
  };

  private attachSupportTicketRelations(ticket: SupportTicket, include?: any) {
    if (!include) return ticket;
    const result: any = { ...ticket };
    if (include.customer) {
      result.customer = this.users.get(ticket.customerId) ?? null;
    }
    if (include.order) {
      const order = ticket.orderId ? this.orders.get(ticket.orderId) : null;
      if (order) {
        const orderResult: any = { ...order };
        if (include.order.include?.driver) {
          orderResult.driver = order.driverId ? this.users.get(order.driverId) ?? null : null;
        }
        if (include.order.include?.stops) {
          const stops = Array.from(this.orderStops.values())
            .filter((s) => s.orderId === order.id)
            .sort((a, b) => a.sequence - b.sequence);
          orderResult.stops = stops;
        }
        if (include.order.include?.trackingPoints) {
          orderResult.trackingPoints = [];
        }
        result.order = orderResult;
      } else {
        result.order = null;
      }
    }
    return result;
  }

  private filterSupportTickets(where?: any): SupportTicket[] {
    let list = Array.from(this.supportTickets.values());
    if (!where) return list;

    const matchesCondition = (t: SupportTicket, cond: any): boolean => {
      if (cond.id && t.id !== cond.id) return false;
      if (cond.orderId && t.orderId !== cond.orderId) return false;
      if (cond.customerId && t.customerId !== cond.customerId) return false;
      if (cond.status) {
        if (typeof cond.status === 'string' && t.status !== cond.status) return false;
        if (cond.status.in && !cond.status.in.includes(t.status)) return false;
      }
      if (cond.category && t.category !== cond.category) return false;
      if (cond.createdAt) {
        if (cond.createdAt.gte && t.createdAt < cond.createdAt.gte) return false;
        if (cond.createdAt.lte && t.createdAt > cond.createdAt.lte) return false;
      }
      if (cond.description?.contains) {
        if (!t.description.toLowerCase().includes(cond.description.contains.toLowerCase())) return false;
      }
      if (cond.customer?.name?.contains) {
        const customer = this.users.get(t.customerId);
        if (!customer?.name?.toLowerCase().includes(cond.customer.name.contains.toLowerCase())) return false;
      }
      if (cond.customer?.phone?.contains) {
        const customer = this.users.get(t.customerId);
        if (!customer?.phone?.toLowerCase().includes(cond.customer.phone.contains.toLowerCase())) return false;
      }
      if (cond.AND && Array.isArray(cond.AND)) {
        if (!cond.AND.every((c: any) => matchesCondition(t, c))) return false;
      }
      if (cond.OR && Array.isArray(cond.OR)) {
        const matched = cond.OR.some((c: any) => {
          if (matchesCondition(t, c)) return true;
          const qNeedle = (c.description?.contains || c.customer?.name?.contains || c.customer?.phone?.contains)?.toLowerCase();
          if (qNeedle) {
            const orderCode = t.orderId ? `lp-${t.orderId.replace(/-/g, '').slice(-4).toLowerCase()}` : '';
            const ticketNum = `tk-${t.id.replace(/-/g, '').slice(-6).toLowerCase()}`;
            if (orderCode && orderCode.includes(qNeedle)) return true;
            if (ticketNum && ticketNum.includes(qNeedle)) return true;
          }
          return false;
        });
        if (!matched) return false;
      }
      return true;
    };

    return list.filter((t) => matchesCondition(t, where));
  }

  supportTicket = {
    create: jest.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const now = data.createdAt ?? new Date();
      const ticket: SupportTicket = {
        id,
        orderId: data.orderId ?? null,
        customerId: data.customerId,
        category: data.category,
        description: data.description,
        hasPhoto: data.hasPhoto ?? false,
        status: (data.status ?? 'OPEN') as SupportTicketStatus,
        createdAt: now,
        updatedAt: data.updatedAt ?? now,
      };
      this.supportTickets.set(id, ticket);
      return ticket;
    }),
    findUnique: jest.fn(async ({ where, include }: { where: { id: string }; include?: any }) => {
      const ticket = this.supportTickets.get(where.id);
      if (!ticket) return null;
      return this.attachSupportTicketRelations(ticket, include);
    }),
    findMany: jest.fn(
      async ({
        where,
        skip = 0,
        take,
        orderBy,
        include,
      }: { where?: any; skip?: number; take?: number; orderBy?: any; include?: any } = {}) => {
        let list = this.filterSupportTickets(where);

        if (orderBy?.createdAt === 'desc') {
          list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } else if (orderBy?.createdAt === 'asc') {
          list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }

        const paginated = take !== undefined ? list.slice(skip, skip + take) : list.slice(skip);
        return paginated.map((t) => this.attachSupportTicketRelations(t, include));
      },
    ),
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      return this.filterSupportTickets(where).length;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<SupportTicket> }) => {
      const existing = this.supportTickets.get(where.id);
      if (!existing) throw new Error('SupportTicket not found');
      const updated: SupportTicket = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      this.supportTickets.set(where.id, updated);
      return updated;
    }),
  };

  private filterOrderReviews(where?: any): OrderReview[] {
    let list = Array.from(this.orderReviews.values());
    if (!where) return list;

    const matchesCondition = (r: OrderReview, cond: any): boolean => {
      if (cond.id && r.id !== cond.id) return false;
      if (cond.orderId && r.orderId !== cond.orderId) return false;
      if (cond.customerId && r.customerId !== cond.customerId) return false;
      if (cond.rating) {
        if (typeof cond.rating === 'number' && r.rating !== cond.rating) return false;
        if (cond.rating.gte !== undefined && r.rating < cond.rating.gte) return false;
        if (cond.rating.lte !== undefined && r.rating > cond.rating.lte) return false;
      }
      if (cond.order?.driverId) {
        const order = this.orders.get(r.orderId);
        if (order?.driverId !== cond.order.driverId) return false;
      }
      if (cond.createdAt) {
        if (cond.createdAt.gte && r.createdAt < cond.createdAt.gte) return false;
        if (cond.createdAt.lte && r.createdAt > cond.createdAt.lte) return false;
      }
      if (cond.comment?.contains) {
        if (!r.comment?.toLowerCase().includes(cond.comment.contains.toLowerCase())) return false;
      }
      if (cond.customer?.name?.contains) {
        const customer = this.users.get(r.customerId);
        if (!customer?.name?.toLowerCase().includes(cond.customer.name.contains.toLowerCase())) return false;
      }
      if (cond.customer?.phone?.contains) {
        const customer = this.users.get(r.customerId);
        if (!customer?.phone?.toLowerCase().includes(cond.customer.phone.contains.toLowerCase())) return false;
      }
      if (cond.order?.clientRequestId?.contains) {
        const order = this.orders.get(r.orderId);
        if (!order?.clientRequestId?.toLowerCase().includes(cond.order.clientRequestId.contains.toLowerCase())) return false;
      }
      if (cond.AND && Array.isArray(cond.AND)) {
        if (!cond.AND.every((c: any) => matchesCondition(r, c))) return false;
      }
      if (cond.OR && Array.isArray(cond.OR)) {
        if (!cond.OR.some((c: any) => matchesCondition(r, c))) return false;
      }
      return true;
    };

    return list.filter((r) => matchesCondition(r, where));
  }

  private attachOrderReviewRelations(review: OrderReview, include?: any) {
    if (!include) return review;
    const result: any = { ...review };
    if (include.customer) {
      result.customer = this.users.get(review.customerId) ?? null;
    }
    if (include.order) {
      const order = this.orders.get(review.orderId);
      if (order) {
        const orderResult: any = { ...order };
        if (include.order.include?.driver) {
          orderResult.driver = order.driverId ? this.users.get(order.driverId) ?? null : null;
        }
        result.order = orderResult;
      } else {
        result.order = null;
      }
    }
    return result;
  }

  orderMessage = {
    create: jest.fn(async ({ data, include }: { data: any; include?: any }) => {
      const id = data.id ?? `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const now = data.createdAt ?? new Date();
      const msg = {
        id,
        orderId: data.orderId,
        senderId: data.senderId,
        body: data.body,
        createdAt: now,
      };
      this.orderMessages.set(id, msg);
      if (include?.sender) {
        return {
          ...msg,
          sender: this.users.get(data.senderId) ?? null,
        };
      }
      return msg;
    }),
    findMany: jest.fn(async ({ where, orderBy, include }: { where?: any; orderBy?: any; include?: any } = {}) => {
      let list = Array.from(this.orderMessages.values());
      if (where?.orderId) {
        list = list.filter((m) => m.orderId === where.orderId);
      }
      if (orderBy?.createdAt === 'desc') {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else if (orderBy?.createdAt === 'asc') {
        list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
      return list.map((m) => {
        if (include?.sender) {
          return {
            ...m,
            sender: this.users.get(m.senderId) ?? null,
          };
        }
        return m;
      });
    }),
  };

  orderReview = {
    create: jest.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? `review-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const now = data.createdAt ?? new Date();
      const review: OrderReview = {
        id,
        orderId: data.orderId,
        customerId: data.customerId,
        rating: data.rating,
        comment: data.comment ?? null,
        tipVnd: data.tipVnd ?? 0,
        createdAt: now,
      };
      this.orderReviews.set(id, review);
      return review;
    }),
    findUnique: jest.fn(async ({ where, include }: { where: { id: string }; include?: any }) => {
      const review = this.orderReviews.get(where.id);
      if (!review) return null;
      return this.attachOrderReviewRelations(review, include);
    }),
    findMany: jest.fn(
      async ({
        where,
        skip = 0,
        take,
        orderBy,
        include,
      }: { where?: any; skip?: number; take?: number; orderBy?: any; include?: any } = {}) => {
        let list = this.filterOrderReviews(where);

        if (orderBy?.createdAt === 'desc') {
          list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } else if (orderBy?.createdAt === 'asc') {
          list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }

        const paginated = take !== undefined ? list.slice(skip, skip + take) : list.slice(skip);
        return paginated.map((r) => this.attachOrderReviewRelations(r, include));
      },
    ),
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      return this.filterOrderReviews(where).length;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<OrderReview> }) => {
      const existing = this.orderReviews.get(where.id);
      if (!existing) throw new Error('OrderReview not found');
      const updated: OrderReview = {
        ...existing,
        ...data,
      };
      this.orderReviews.set(where.id, updated);
      return updated;
    }),
  };
}
