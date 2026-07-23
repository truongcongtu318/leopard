import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import yaml from 'js-yaml';

// ── Canonical enum values from packages/shared/src/enums.ts ──────────────

const SHARED_ENUMS: Record<string, readonly string[]> = {
  Role: ['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN'],
  UserStatus: ['ACTIVE', 'DISABLED'],
  FleetMemberRole: ['OWNER', 'DRIVER'],
  FleetMemberStatus: ['INVITED', 'ACTIVE', 'REMOVED'],
  DriverAvailability: ['OFFLINE', 'AVAILABLE', 'BUSY'],
  VehicleType: ['MOTORBIKE', 'VAN', 'TRUCK'],
  OrderStatus: ['REQUESTED', 'ACCEPTED', 'PICKING_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  StopType: ['PICKUP', 'STOP', 'DROPOFF'],
  MediaType: ['CARGO', 'DELIVERY_PROOF'],
  PaymentStatus: ['UNPAID', 'QR_CREATED', 'PAID_MANUAL', 'FAILED'],
  ProviderSource: ['VIETMAP', 'DEMO', 'PAYOS', 'VIETQR', 'LOCAL', 'S3'],
};

// ── Helpers ─────────────────────────────────────────────────────────────

interface OpenApiDoc {
  openapi: string;
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, Record<string, unknown>>;
    securitySchemes?: Record<string, Record<string, unknown>>;
  };
  security?: unknown[];
}

interface PathItem {
  operationId?: string;
  security?: unknown[];
  [key: string]: unknown;
}

function loadDoc(): OpenApiDoc {
  const filePath = resolve(import.meta.dirname, '..', 'openapi', 'openapi.yaml');
  const raw = readFileSync(filePath, 'utf-8');

  return yaml.load(raw) as OpenApiDoc;
}

function getAllPaths(doc: OpenApiDoc): Array<{ path: string; method: string; item: PathItem }> {
  const entries: Array<{ path: string; method: string; item: PathItem }> = [];

  for (const [path, methods] of Object.entries(doc.paths)) {
    for (const [method, item] of Object.entries(methods as Record<string, PathItem>)) {
      entries.push({ path, method: method.toUpperCase(), item });
    }
  }

  return entries;
}

// Public path prefixes (NO bearer auth required)
const PUBLIC_PATHS = ['/auth/login/demo', '/auth/firebase', '/health/live', '/health/ready'];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.includes(path);
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('OpenAPI 3.1 Contract', () => {
  let doc: OpenApiDoc;

  beforeAll(() => {
    doc = loadDoc();
  });

  it('should be valid OpenAPI 3.1', () => {
    expect(doc).toBeDefined();
    expect(doc.openapi).toBe('3.1.0');
  });

  it('should have paths defined', () => {
    expect(doc.paths).toBeDefined();
    expect(Object.keys(doc.paths).length).toBeGreaterThan(0);
  });

  describe('operationId uniqueness', () => {
    it('should have no duplicate operationIds', () => {
      const allPaths = getAllPaths(doc);
      const opIds = allPaths
        .map((p) => p.item.operationId)
        .filter(Boolean) as string[];

      const duplicates = opIds.filter((id, index) => opIds.indexOf(id) !== index);

      if (duplicates.length > 0) {
        throw new Error(`Duplicate operationIds found: ${[...new Set(duplicates)].join(', ')}`);
      }

      expect(duplicates).toHaveLength(0);
    });

    it('should have an operationId for every endpoint', () => {
      const allPaths = getAllPaths(doc);
      const missing = allPaths.filter((p) => !p.item.operationId);

      if (missing.length > 0) {
        const labels = missing.map((p) => `${p.method} ${p.path}`).join(', ');

        throw new Error(`Missing operationId on: ${labels}`);
      }

      expect(missing).toHaveLength(0);
    });
  });

  describe('security', () => {
    it('should have bearerAuth as global security', () => {
      expect(doc.security).toBeDefined();
      expect(doc.security).toHaveLength(1);
      expect(doc.security![0]).toEqual({ bearerAuth: [] });
    });

    it('should have bearerAuth security scheme defined', () => {
      const schemes = doc.components.securitySchemes;

      expect(schemes).toBeDefined();
      expect(schemes!.bearerAuth).toBeDefined();
      expect(schemes!.bearerAuth).toMatchObject({
        type: 'http',
        scheme: 'bearer',
      });
    });

    it('should require bearer security on all private paths', () => {
      const allPaths = getAllPaths(doc);
      const privatePaths = allPaths.filter((p) => !isPublicPath(p.path));

      const missing = privatePaths.filter((p) => {
        const sec = p.item.security;

        // If no explicit security, inherits from global (which is bearerAuth).
        // If explicitly set, must include bearerAuth.
        if (sec === undefined) return false;
        if (Array.isArray(sec) && sec.length === 0) return true;

        if (Array.isArray(sec) && sec.some((s) => s && (s as Record<string, unknown>).bearerAuth)) return false;

        return false;
      });

      if (missing.length > 0) {
        const labels = missing.map((p) => `${p.method} ${p.path}`).join(', ');

        throw new Error(`Private paths missing bearer security: ${labels}`);
      }

      expect(missing).toHaveLength(0);
    });

    it('should have NO security on public endpoints', () => {
      const allPaths = getAllPaths(doc);
      const publicPaths = allPaths.filter((p) => isPublicPath(p.path));

      const secured = publicPaths.filter((p) => {
        const sec = p.item.security;

        // Must explicitly be empty array (no security)
        if (Array.isArray(sec) && sec.length === 0) return false;

        return true;
      });

      if (secured.length > 0) {
        const labels = secured.map((p) => `${p.method} ${p.path}`).join(', ');

        throw new Error(`Public endpoints that should have no security but do: ${labels}`);
      }

      expect(secured).toHaveLength(0);
    });
  });

  describe('enum schemas match shared enums', () => {
    for (const [schemaName, sharedValues] of Object.entries(SHARED_ENUMS)) {
      it(`should match shared enum for ${schemaName}`, () => {
        const schema = doc.components.schemas[schemaName];

        expect(schema).toBeDefined();
        expect(schema.type).toBe('string');

        const openApiValues = schema.enum as string[];

        expect([...openApiValues].sort()).toEqual([...sharedValues].sort());
      });
    }
  });

  describe('required schemas', () => {
    const requiredSchemas = [
      'PaginationEnvelope',
      'ApiErrorEnvelope',
      'OrderSchema',
      'EstimateResponse',
      'SessionResponse',
      'UserProfile',
      'TrackingHistory',
      'PaymentRecord',
      'MediaRecord',
      'HealthStatus',
      'AdminDashboard',
    ];

    for (const schemaName of requiredSchemas) {
      it(`should have schema ${schemaName}`, () => {
        expect(doc.components.schemas[schemaName]).toBeDefined();
      });
    }
  });

  describe('PaginationEnvelope schema', () => {
    it('should have the correct envelope shape', () => {
      const schema = doc.components.schemas.PaginationEnvelope;

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.required).toEqual(['items', 'page', 'pageSize', 'total', 'totalPages']);

      const props = schema.properties as Record<string, Record<string, unknown>>;

      expect(props.items.type).toBe('array');
      expect(props.page.type).toBe('integer');
      expect(props.pageSize.type).toBe('integer');
      expect(props.total.type).toBe('integer');
      expect(props.totalPages.type).toBe('integer');
    });
  });

  describe('ApiErrorEnvelope schema', () => {
    it('should have the correct error envelope shape', () => {
      const schema = doc.components.schemas.ApiErrorEnvelope;

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.required).toContain('statusCode');
      expect(schema.required).toContain('code');
      expect(schema.required).toContain('message');
      expect(schema.required).toContain('requestId');
      expect(schema.required).toContain('timestamp');
    });
  });

  describe('OrderSchema', () => {
    it('should have the correct order shape', () => {
      const schema = doc.components.schemas.OrderSchema;

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('status');
      expect(schema.required).toContain('vehicleType');
    });
  });

  describe('EstimateResponse schema', () => {
    it('should include estimateToken, polyline, and price fields', () => {
      const schema = doc.components.schemas.EstimateResponse;

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.required).toContain('estimateToken');
      expect(schema.required).toContain('polyline');
      expect(schema.required).toContain('distanceM');
      expect(schema.required).toContain('durationS');
      expect(schema.required).toContain('estimatedArrivalAt');
      expect(schema.required).toContain('estimatedPriceVnd');
      expect(schema.required).toContain('source');
      expect(schema.required).toContain('isEstimate');
      expect(schema.required).toContain('calculatedAt');
    });
  });
});
