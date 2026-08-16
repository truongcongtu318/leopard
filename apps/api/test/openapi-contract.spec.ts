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

const WAVE_3_ERROR_CODES = [
  'TRACKING_FORBIDDEN',
  'TRACKING_INVALID_POINT',
  'TRACKING_RATE_LIMITED',
  'TRACKING_ORDER_INACTIVE',
  'TRACKING_POINT_CONFLICT',
  'MEDIA_INVALID_FILE',
  'MEDIA_TOO_LARGE',
  'MEDIA_REQUEST_CONFLICT',
  'PAYMENT_INTENT_EXISTS',
  'PAYMENT_REQUEST_CONFLICT',
  'PAYMENT_CONFIRMATION_CONFLICT',
  'PROVIDER_UNAVAILABLE',
] as const;

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

interface OpenApiSchema {
  type?: string;
  format?: string;
  additionalProperties?: boolean;
  enum?: string[];
  required?: string[];
  properties?: Record<string, OpenApiSchema & { $ref?: string }>;
  items?: OpenApiSchema & { $ref?: string };
  $ref?: string;
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
const PUBLIC_PATHS = [
  '/auth/login/demo',
  '/auth/firebase',
  '/auth/refresh',
  '/health/live',
  '/health/ready',
];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.includes(path);
}

function operation(doc: OpenApiDoc, path: string, method: string): PathItem {
  return doc.paths[path]?.[method] as PathItem;
}

function parameterNames(doc: OpenApiDoc, path: string): string[] {
  const item = operation(doc, path, 'get');
  const parameters = item.parameters as Array<{ name?: string; $ref?: string }>;

  return parameters.map((parameter) => {
    if (parameter.name) return parameter.name;

    return parameter.$ref?.split('/').at(-1) ?? '';
  });
}

function responseSchema(item: PathItem, status: string): OpenApiSchema {
  const responses = item.responses as Record<
    string,
    { content: { 'application/json': { schema: OpenApiSchema } } }
  >;

  return responses[status].content['application/json'].schema;
}

function requestSchema(item: PathItem, contentType: string): OpenApiSchema {
  const requestBody = item.requestBody as {
    required?: boolean;
    content: Record<string, { schema: OpenApiSchema }>;
  };

  expect(requestBody.required).toBe(true);

  return requestBody.content[contentType].schema;
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

        if (
          Array.isArray(sec) &&
          sec.some(
            (s) =>
              s &&
              Object.prototype.hasOwnProperty.call(
                s as Record<string, unknown>,
                'bearerAuth',
              ),
          )
        ) {
          return false;
        }

        return true;
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
      'TrackingPoint',
      'TrackingPointPage',
      'CreatePaymentIntentRequest',
      'PaymentQrDto',
      'Wave3ErrorCode',
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

  describe('Wave 3 tracking contract', () => {
    const trackingPaths = [
      '/orders/{id}/tracking',
      '/fleet/orders/{id}/tracking',
    ];

    it.each(trackingPaths)(
      'should expose the shared tracking query and page projection on %s',
      (path) => {
        expect(parameterNames(doc, path)).toEqual([
          'OrderIdParam',
          'FromParam',
          'ToParam',
          'PageParam',
          'PageSizeParam',
        ]);
        expect(responseSchema(operation(doc, path, 'get'), '200')).toEqual({
          $ref: '#/components/schemas/TrackingPointPage',
        });
      },
    );

    it('should define UTC tracking filters and the bounded point page', () => {
      const parameters = doc.components as unknown as {
        parameters: Record<string, { schema: OpenApiSchema }>;
      };

      expect(parameters.parameters.FromParam.schema).toMatchObject({
        type: 'string',
        format: 'date-time',
        pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$',
      });
      expect(parameters.parameters.ToParam.schema).toMatchObject({
        type: 'string',
        format: 'date-time',
        pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$',
      });

      const point = doc.components.schemas.TrackingPoint as OpenApiSchema;
      expect(point.required).toEqual([
        'id',
        'orderId',
        'driverId',
        'clientPointId',
        'latitude',
        'longitude',
        'capturedAt',
        'createdAt',
      ]);
      expect(point.properties?.accuracyM).toBeDefined();

      const page = doc.components.schemas.TrackingPointPage as OpenApiSchema;
      expect(page.required).toEqual([
        'items',
        'page',
        'pageSize',
        'total',
        'totalPages',
      ]);
      expect(page.properties?.items.items?.$ref).toBe(
        '#/components/schemas/TrackingPoint',
      );
      expect(doc.components.schemas.TrackingHistory).toBeUndefined();
    });
  });

  describe('Wave 3 payment contract', () => {
    it('should require a UUID clientRequestId when creating an intent', () => {
      const item = operation(doc, '/orders/{id}/payments', 'post');

      expect(requestSchema(item, 'application/json')).toEqual({
        $ref: '#/components/schemas/CreatePaymentIntentRequest',
      });

      const request = doc.components.schemas
        .CreatePaymentIntentRequest as OpenApiSchema;
      expect(request.required).toEqual(['clientRequestId']);
      expect(request.additionalProperties).toBe(false);
      expect(request.properties?.clientRequestId).toMatchObject({
        type: 'string',
        format: 'uuid',
      });
    });

    it('should return the safe QR projection without provider snapshots', () => {
      const item = operation(doc, '/orders/{id}/payments', 'post');
      expect(responseSchema(item, '201')).toEqual({
        $ref: '#/components/schemas/PaymentQrDto',
      });

      const projection = doc.components.schemas.PaymentQrDto as OpenApiSchema;
      expect(projection.additionalProperties).toBe(false);
      expect(projection.required).toEqual(
        expect.arrayContaining([
          'amountVnd',
          'provider',
          'providerReference',
          'expiresAt',
          'qrPayload',
        ]),
      );
      expect(Object.keys(projection.properties ?? {}).sort()).toEqual(
        ['amountVnd', 'expiresAt', 'provider', 'providerReference', 'qrPayload'].sort(),
      );
      expect(projection.properties?.providerSnapshot).toBeUndefined();
      expect(projection.properties?.provider?.$ref).toBe(
        '#/components/schemas/PaymentProvider',
      );
      expect(
        (doc.components.schemas.PaymentProvider as OpenApiSchema).enum,
      ).toEqual(['DEMO', 'PAYOS', 'VIETQR']);
    });

    it('should bound payment history records to the safe projection', () => {
      const projection = doc.components.schemas.PaymentRecord as OpenApiSchema;
      expect(projection.additionalProperties).toBe(false);
      expect(Object.keys(projection.properties ?? {}).sort()).toEqual(
        [
          'id',
          'orderId',
          'amountVnd',
          'status',
          'provider',
          'providerReference',
          'expiresAt',
          'qrPayload',
          'confirmedBy',
          'confirmedAt',
          'note',
          'createdAt',
          'updatedAt',
        ].sort(),
      );
      expect(projection.properties?.providerSnapshot).toBeUndefined();
    });
  });

  describe('Wave 3 media contract', () => {
    it.each([
      '/orders/{id}/media/cargo',
      '/orders/{id}/media/delivery-proof',
    ])('should require file and clientRequestId on %s', (path) => {
      expect(requestSchema(operation(doc, path, 'post'), 'multipart/form-data')).toEqual({
        $ref: '#/components/schemas/MediaUploadRequest',
      });

      const request = doc.components.schemas.MediaUploadRequest as OpenApiSchema;
      expect(request.required).toEqual(['file', 'clientRequestId']);
      expect(request.properties?.file).toMatchObject({
        type: 'string',
        format: 'binary',
      });
      expect(request.properties?.clientRequestId).toMatchObject({
        type: 'string',
        format: 'uuid',
      });
    });

    it('should bound media records without storage metadata', () => {
      const projection = doc.components.schemas.MediaRecord as OpenApiSchema;
      expect(projection.additionalProperties).toBe(false);
      expect(Object.keys(projection.properties ?? {}).sort()).toEqual(
        ['id', 'type', 'orderId', 'uploadedBy', 'url', 'createdAt'].sort(),
      );
      expect(projection.properties?.storageKey).toBeUndefined();
      expect(projection.properties?.checksumSha256).toBeUndefined();
    });
  });

  it('should publish the stable Wave 3 error codes', () => {
    expect((doc.components.schemas.Wave3ErrorCode as OpenApiSchema).enum).toEqual(
      WAVE_3_ERROR_CODES,
    );
  });
});
