CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "FleetMemberRole" AS ENUM ('OWNER', 'DRIVER');
CREATE TYPE "FleetMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'REMOVED');
CREATE TYPE "DriverAvailability" AS ENUM ('OFFLINE', 'AVAILABLE', 'BUSY');
CREATE TYPE "VehicleType" AS ENUM ('MOTORBIKE', 'VAN', 'TRUCK');
CREATE TYPE "OrderStatus" AS ENUM (
  'REQUESTED',
  'ACCEPTED',
  'PICKING_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED'
);
CREATE TYPE "StopType" AS ENUM ('PICKUP', 'STOP', 'DROPOFF');
CREATE TYPE "MediaType" AS ENUM ('CARGO', 'DELIVERY_PROOF');
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'QR_CREATED', 'PAID_MANUAL', 'FAILED');
CREATE TYPE "ProviderSource" AS ENUM ('VIETMAP', 'DEMO', 'PAYOS', 'VIETQR', 'LOCAL', 'S3');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "phone" VARCHAR(32) NOT NULL,
  "role" "Role" NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Fleet" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Fleet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FleetMember" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fleetId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" "FleetMemberRole" NOT NULL,
  "status" "FleetMemberStatus" NOT NULL DEFAULT 'INVITED',
  "invitedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "joinedAt" TIMESTAMPTZ(3),
  "removedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FleetMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DriverProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "availability" "DriverAvailability" NOT NULL DEFAULT 'OFFLINE',
  "vehicleType" "VehicleType" NOT NULL,
  "lastKnownLocation" geography(Point,4326),
  "lastKnownAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customerId" UUID NOT NULL,
  "driverId" UUID,
  "status" "OrderStatus" NOT NULL DEFAULT 'REQUESTED',
  "routeSnapshot" JSONB,
  "providerSource" "ProviderSource",
  "distanceMeters" INTEGER,
  "durationSeconds" INTEGER,
  "priceVnd" INTEGER,
  "etaSeconds" INTEGER,
  "acceptedAt" TIMESTAMPTZ(3),
  "pickingUpAt" TIMESTAMPTZ(3),
  "inTransitAt" TIMESTAMPTZ(3),
  "deliveredAt" TIMESTAMPTZ(3),
  "cancelledAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderStop" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "type" "StopType" NOT NULL,
  "sequence" INTEGER NOT NULL,
  "address" TEXT NOT NULL,
  "location" geography(Point,4326) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderStatusHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus" NOT NULL,
  "actorId" UUID,
  "reason" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrackingPoint" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "driverId" UUID NOT NULL,
  "clientPointId" TEXT NOT NULL,
  "location" geography(Point,4326) NOT NULL,
  "capturedAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrackingPoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaObject" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "uploaderId" UUID NOT NULL,
  "type" "MediaType" NOT NULL,
  "provider" "ProviderSource" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaObject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentIntent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "provider" "ProviderSource" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "amountVnd" INTEGER NOT NULL,
  "qrPayload" TEXT,
  "providerSnapshot" JSONB,
  "expiresAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actorId" UUID,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" UUID,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");
CREATE INDEX "RefreshSession_userId_expiresAt_idx" ON "RefreshSession"("userId", "expiresAt" DESC);
CREATE UNIQUE INDEX "FleetMember_fleetId_userId_key" ON "FleetMember"("fleetId", "userId");
CREATE INDEX "FleetMember_fleetId_role_status_idx" ON "FleetMember"("fleetId", "role", "status");
CREATE UNIQUE INDEX "FleetMember_active_driver_key"
  ON "FleetMember"("userId")
  WHERE "role" = 'DRIVER' AND "status" = 'ACTIVE';
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");
CREATE INDEX "DriverProfile_lastKnownLocation_gist" ON "DriverProfile" USING GIST ("lastKnownLocation");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt" DESC);
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt" DESC);
CREATE UNIQUE INDEX "Order_active_driver_key"
  ON "Order"("driverId")
  WHERE "driverId" IS NOT NULL
    AND "status" IN ('ACCEPTED', 'PICKING_UP', 'IN_TRANSIT');
CREATE UNIQUE INDEX "OrderStop_orderId_sequence_key" ON "OrderStop"("orderId", "sequence");
CREATE INDEX "OrderStop_location_gist" ON "OrderStop" USING GIST ("location");
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx"
  ON "OrderStatusHistory"("orderId", "createdAt" DESC);
CREATE UNIQUE INDEX "TrackingPoint_orderId_clientPointId_key"
  ON "TrackingPoint"("orderId", "clientPointId");
CREATE INDEX "TrackingPoint_orderId_capturedAt_idx"
  ON "TrackingPoint"("orderId", "capturedAt" DESC);
CREATE INDEX "TrackingPoint_location_gist" ON "TrackingPoint" USING GIST ("location");
CREATE UNIQUE INDEX "MediaObject_storageKey_key" ON "MediaObject"("storageKey");
CREATE INDEX "PaymentIntent_orderId_createdAt_idx"
  ON "PaymentIntent"("orderId", "createdAt" DESC);
CREATE UNIQUE INDEX "PaymentIntent_active_order_key"
  ON "PaymentIntent"("orderId")
  WHERE "status" IN ('UNPAID', 'QR_CREATED');
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt" DESC);
CREATE INDEX "AuditLog_resourceType_resourceId_createdAt_idx"
  ON "AuditLog"("resourceType", "resourceId", "createdAt" DESC);

ALTER TABLE "RefreshSession"
  ADD CONSTRAINT "RefreshSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetMember"
  ADD CONSTRAINT "FleetMember_fleetId_fkey"
  FOREIGN KEY ("fleetId") REFERENCES "Fleet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FleetMember"
  ADD CONSTRAINT "FleetMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DriverProfile"
  ADD CONSTRAINT "DriverProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderStop"
  ADD CONSTRAINT "OrderStop_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderStatusHistory"
  ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderStatusHistory"
  ADD CONSTRAINT "OrderStatusHistory_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrackingPoint"
  ADD CONSTRAINT "TrackingPoint_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrackingPoint"
  ADD CONSTRAINT "TrackingPoint_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MediaObject"
  ADD CONSTRAINT "MediaObject_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MediaObject"
  ADD CONSTRAINT "MediaObject_uploaderId_fkey"
  FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent"
  ADD CONSTRAINT "PaymentIntent_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
