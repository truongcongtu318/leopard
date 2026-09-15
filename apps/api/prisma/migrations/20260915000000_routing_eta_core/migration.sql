-- CreateEnum
CREATE TYPE "RouteSnapshotReason" AS ENUM ('INITIAL_QUOTE', 'REROUTE', 'STOP_COMPLETED', 'MANUAL_RECOVERY');

-- CreateEnum
CREATE TYPE "RouteProviderSource" AS ENUM ('VIETMAP', 'DEMO');

-- CreateEnum
CREATE TYPE "VehicleProfileSource" AS ENUM ('STANDARD_QUOTE_PROFILE', 'ASSIGNED_VEHICLE_PROFILE', 'MANUAL_RECOVERY');

-- CreateEnum
CREATE TYPE "RouteSnapshotQuality" AS ENUM ('VERIFIED_PROVIDER', 'DEMO', 'LEGACY_RECOVERED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "EstimateKind" AS ENUM ('NEXT_STOP', 'COMPLETION');

-- CreateEnum
CREATE TYPE "LiveEstimateStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "EtaUnavailableReason" AS ENUM ('NO_TARGET_STOP', 'GPS_TOO_OLD', 'ROUTE_UNAVAILABLE', 'PROVIDER_EXHAUSTED', 'INVALID_ROUTE_INPUT');

-- CreateEnum
CREATE TYPE "EtaAdjustmentSource" AS ENUM ('NONE', 'WEATHER', 'OPERATIONAL', 'WEATHER_AND_OPERATIONAL');

-- CreateEnum
CREATE TYPE "OutboxEventType" AS ENUM ('ROUTE_ETA_RECOMPUTE', 'ROUTE_ETA_UPDATED', 'ROUTE_UPDATED');

-- CreateEnum
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'LEASED', 'COMPLETED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "StopProgressStep" AS ENUM ('ARRIVED', 'SERVICE_STARTED', 'SERVICE_COMPLETED');

-- CreateEnum
CREATE TYPE "StopProgressAction" AS ENUM ('RECORDED', 'VOIDED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "activeRouteSnapshotId" UUID,
ADD COLUMN     "currentCompletionEstimateId" UUID,
ADD COLUMN     "currentNextStopEstimateId" UUID,
ADD COLUMN     "quotedRouteSnapshotId" UUID,
ADD COLUMN     "routeEtaInputRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "routeEtaLastBumpAt" TIMESTAMPTZ(3),
ADD COLUMN     "routeEtaLastGpsPointId" UUID,
ADD COLUMN     "routeSnapshotVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VehicleRoutingProfile" (
    "id" UUID NOT NULL,
    "driverProfileId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "tareWeightKg" INTEGER NOT NULL,
    "maxPayloadKg" INTEGER NOT NULL,
    "maxGrossWeightKg" INTEGER NOT NULL,
    "verifiedAt" TIMESTAMPTZ(3),
    "verifiedById" UUID,
    "supersededAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleRoutingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteVehicleRoutingPolicy" (
    "id" UUID NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "version" INTEGER NOT NULL,
    "assumedTareWeightKg" INTEGER NOT NULL,
    "assumedMaxPayloadKg" INTEGER NOT NULL,
    "assumedMaxGrossWeightKg" INTEGER NOT NULL,
    "operationalAllowanceKg" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
    "supersededAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteVehicleRoutingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderRouteSnapshot" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" "RouteSnapshotReason" NOT NULL,
    "quality" "RouteSnapshotQuality" NOT NULL,
    "geometry" TEXT NOT NULL,
    "geometryEncoding" VARCHAR(16) NOT NULL,
    "routeHash" VARCHAR(64) NOT NULL,
    "inputHash" VARCHAR(64) NOT NULL,
    "hashAlgorithmVersion" VARCHAR(16) NOT NULL,
    "providerRouteId" TEXT,
    "legs" JSONB NOT NULL,
    "stopSequence" JSONB NOT NULL,
    "normalizedInput" JSONB NOT NULL,
    "vehicleProfileSource" "VehicleProfileSource" NOT NULL,
    "vehicleRoutingProfileId" UUID,
    "quoteVehicleRoutingPolicyId" UUID,
    "departureAt" TIMESTAMPTZ(3) NOT NULL,
    "source" "RouteProviderSource" NOT NULL,
    "calculatedAt" TIMESTAMPTZ(3) NOT NULL,
    "legacySourceSnapshotJson" JSONB,
    "legacyMissingFields" TEXT[],
    "recoveryJobVersion" TEXT,
    "recoveredAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderRouteSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLiveEstimate" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "inputRevision" INTEGER NOT NULL,
    "kind" "EstimateKind" NOT NULL,
    "targetStopId" UUID,
    "routeSnapshotId" UUID NOT NULL,
    "status" "LiveEstimateStatus" NOT NULL,
    "unavailableReason" "EtaUnavailableReason",
    "remainingDistanceM" INTEGER,
    "remainingDurationS" INTEGER,
    "arrivalAt" TIMESTAMPTZ(3),
    "baselineDurationS" INTEGER,
    "adjustmentDurationS" INTEGER NOT NULL DEFAULT 0,
    "baselineSource" "RouteProviderSource" NOT NULL,
    "adjustmentSource" "EtaAdjustmentSource" NOT NULL DEFAULT 'NONE',
    "weatherSnapshotVersion" INTEGER,
    "policyVersion" INTEGER NOT NULL DEFAULT 1,
    "gpsPointId" UUID,
    "calculatedAt" TIMESTAMPTZ(3) NOT NULL,
    "validUntil" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderLiveEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StopProgressEvent" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "stopId" UUID NOT NULL,
    "step" "StopProgressStep" NOT NULL,
    "action" "StopProgressAction" NOT NULL DEFAULT 'RECORDED',
    "actorId" UUID NOT NULL,
    "clientRequestId" TEXT,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "supersedesEventId" UUID,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StopProgressEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StopProgressState" (
    "orderId" UUID NOT NULL,
    "stopId" UUID NOT NULL,
    "step" "StopProgressStep" NOT NULL,
    "activeEventId" UUID NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StopProgressState_pkey" PRIMARY KEY ("orderId","stopId","step")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "aggregateType" VARCHAR(64) NOT NULL,
    "aggregateId" UUID NOT NULL,
    "type" "OutboxEventType" NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "inputRevision" INTEGER,
    "payload" JSONB NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "leaseOwner" VARCHAR(128),
    "leaseGeneration" INTEGER NOT NULL DEFAULT 0,
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" VARCHAR(500),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleRoutingProfile_driverProfileId_supersededAt_idx" ON "VehicleRoutingProfile"("driverProfileId", "supersededAt");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleRoutingProfile_driverProfileId_version_key" ON "VehicleRoutingProfile"("driverProfileId", "version");

-- CreateIndex
CREATE INDEX "QuoteVehicleRoutingPolicy_vehicleType_supersededAt_idx" ON "QuoteVehicleRoutingPolicy"("vehicleType", "supersededAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteVehicleRoutingPolicy_vehicleType_version_key" ON "QuoteVehicleRoutingPolicy"("vehicleType", "version");

-- CreateIndex
CREATE UNIQUE INDEX "OrderRouteSnapshot_orderId_version_key" ON "OrderRouteSnapshot"("orderId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "order_route_snapshot_order_id_id_key" ON "OrderRouteSnapshot"("orderId", "id");

-- CreateIndex
CREATE INDEX "OrderLiveEstimate_orderId_inputRevision_idx" ON "OrderLiveEstimate"("orderId", "inputRevision");

-- CreateIndex
CREATE INDEX "OrderLiveEstimate_orderId_status_kind_idx" ON "OrderLiveEstimate"("orderId", "status", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "OrderLiveEstimate_orderId_inputRevision_kind_key" ON "OrderLiveEstimate"("orderId", "inputRevision", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "order_live_estimate_order_id_id_key" ON "OrderLiveEstimate"("orderId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "StopProgressEvent_supersedesEventId_key" ON "StopProgressEvent"("supersedesEventId");

-- CreateIndex
CREATE INDEX "StopProgressEvent_orderId_stopId_step_idx" ON "StopProgressEvent"("orderId", "stopId", "step");

-- CreateIndex
CREATE UNIQUE INDEX "StopProgressEvent_stopId_clientRequestId_key" ON "StopProgressEvent"("stopId", "clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "stop_progress_event_order_stop_step_id_key" ON "StopProgressEvent"("orderId", "stopId", "step", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stop_progress_event_void_target_key" ON "StopProgressEvent"("orderId", "stopId", "step", "supersedesEventId");

-- CreateIndex
CREATE UNIQUE INDEX "StopProgressState_activeEventId_key" ON "StopProgressState"("activeEventId");

-- CreateIndex
CREATE UNIQUE INDEX "stop_progress_state_active_event_key" ON "StopProgressState"("orderId", "stopId", "step", "activeEventId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_dedupeKey_key" ON "OutboxEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_nextAttemptAt_idx" ON "OutboxEvent"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_leaseExpiresAt_idx" ON "OutboxEvent"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateId_type_inputRevision_idx" ON "OutboxEvent"("aggregateId", "type", "inputRevision" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "OrderStop_id_orderId_key" ON "OrderStop"("id", "orderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_id_quotedRouteSnapshotId_fkey" FOREIGN KEY ("id", "quotedRouteSnapshotId") REFERENCES "OrderRouteSnapshot"("orderId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_id_activeRouteSnapshotId_fkey" FOREIGN KEY ("id", "activeRouteSnapshotId") REFERENCES "OrderRouteSnapshot"("orderId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_id_currentNextStopEstimateId_fkey" FOREIGN KEY ("id", "currentNextStopEstimateId") REFERENCES "OrderLiveEstimate"("orderId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_id_currentCompletionEstimateId_fkey" FOREIGN KEY ("id", "currentCompletionEstimateId") REFERENCES "OrderLiveEstimate"("orderId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRoutingProfile" ADD CONSTRAINT "VehicleRoutingProfile_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRoutingProfile" ADD CONSTRAINT "VehicleRoutingProfile_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRouteSnapshot" ADD CONSTRAINT "OrderRouteSnapshot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRouteSnapshot" ADD CONSTRAINT "OrderRouteSnapshot_vehicleRoutingProfileId_fkey" FOREIGN KEY ("vehicleRoutingProfileId") REFERENCES "VehicleRoutingProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRouteSnapshot" ADD CONSTRAINT "OrderRouteSnapshot_quoteVehicleRoutingPolicyId_fkey" FOREIGN KEY ("quoteVehicleRoutingPolicyId") REFERENCES "QuoteVehicleRoutingPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLiveEstimate" ADD CONSTRAINT "OrderLiveEstimate_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLiveEstimate" ADD CONSTRAINT "OrderLiveEstimate_orderId_routeSnapshotId_fkey" FOREIGN KEY ("orderId", "routeSnapshotId") REFERENCES "OrderRouteSnapshot"("orderId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLiveEstimate" ADD CONSTRAINT "OrderLiveEstimate_targetStopId_fkey" FOREIGN KEY ("targetStopId") REFERENCES "OrderStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLiveEstimate" ADD CONSTRAINT "OrderLiveEstimate_gpsPointId_fkey" FOREIGN KEY ("gpsPointId") REFERENCES "TrackingPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopProgressEvent" ADD CONSTRAINT "StopProgressEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopProgressEvent" ADD CONSTRAINT "StopProgressEvent_stopId_orderId_fkey" FOREIGN KEY ("stopId", "orderId") REFERENCES "OrderStop"("id", "orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopProgressEvent" ADD CONSTRAINT "StopProgressEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopProgressEvent" ADD CONSTRAINT "StopProgressEvent_orderId_stopId_step_supersedesEventId_fkey" FOREIGN KEY ("orderId", "stopId", "step", "supersedesEventId") REFERENCES "StopProgressEvent"("orderId", "stopId", "step", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopProgressState" ADD CONSTRAINT "StopProgressState_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopProgressState" ADD CONSTRAINT "StopProgressState_stopId_orderId_fkey" FOREIGN KEY ("stopId", "orderId") REFERENCES "OrderStop"("id", "orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopProgressState" ADD CONSTRAINT "StopProgressState_orderId_stopId_step_activeEventId_fkey" FOREIGN KEY ("orderId", "stopId", "step", "activeEventId") REFERENCES "StopProgressEvent"("orderId", "stopId", "step", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Manually added raw SQL (Task 1 brief Step 5) — partial unique indexes and CHECK constraints
-- not expressible in Prisma DSL. Copied verbatim from design spec §3.1-§3.5.

CREATE UNIQUE INDEX "vehicle_routing_profile_current_key"
  ON "VehicleRoutingProfile" ("driverProfileId") WHERE "supersededAt" IS NULL;
CREATE UNIQUE INDEX "quote_vehicle_routing_policy_current_key"
  ON "QuoteVehicleRoutingPolicy" ("vehicleType") WHERE "supersededAt" IS NULL;

ALTER TABLE "VehicleRoutingProfile" ADD CONSTRAINT "vehicle_routing_profile_weight_bounds"
  CHECK ("tareWeightKg" > 0 AND "maxPayloadKg" >= 0 AND "maxGrossWeightKg" >= "tareWeightKg");
ALTER TABLE "QuoteVehicleRoutingPolicy" ADD CONSTRAINT "quote_vehicle_routing_policy_allowance_bounds"
  CHECK ("operationalAllowanceKg" >= 0);

ALTER TABLE "OrderRouteSnapshot" ADD CONSTRAINT "order_route_snapshot_profile_source_consistency"
  CHECK (
    ("vehicleProfileSource" = 'STANDARD_QUOTE_PROFILE' AND "quoteVehicleRoutingPolicyId" IS NOT NULL AND "vehicleRoutingProfileId" IS NULL)
    OR ("vehicleProfileSource" = 'ASSIGNED_VEHICLE_PROFILE' AND "vehicleRoutingProfileId" IS NOT NULL AND "quoteVehicleRoutingPolicyId" IS NULL)
    OR ("vehicleProfileSource" = 'MANUAL_RECOVERY' AND "vehicleRoutingProfileId" IS NULL AND "quoteVehicleRoutingPolicyId" IS NULL)
  );

ALTER TABLE "OrderLiveEstimate" ADD CONSTRAINT "order_live_estimate_available_requires_result"
  CHECK (status <> 'AVAILABLE' OR ("remainingDurationS" IS NOT NULL AND "arrivalAt" IS NOT NULL));
ALTER TABLE "OrderLiveEstimate" ADD CONSTRAINT "order_live_estimate_unavailable_requires_reason"
  CHECK (status <> 'UNAVAILABLE' OR "unavailableReason" IS NOT NULL);

ALTER TABLE "StopProgressEvent" ADD CONSTRAINT "stop_progress_event_recorded_no_supersedes"
  CHECK (action <> 'RECORDED' OR "supersedesEventId" IS NULL);
ALTER TABLE "StopProgressEvent" ADD CONSTRAINT "stop_progress_event_voided_requires_supersedes"
  CHECK (action <> 'VOIDED' OR ("supersedesEventId" IS NOT NULL AND reason IS NOT NULL AND length(trim(reason)) > 0));

CREATE INDEX "OutboxEvent_pending_claim_idx" ON "OutboxEvent" ("nextAttemptAt","createdAt") WHERE status = 'PENDING';
CREATE INDEX "OutboxEvent_expired_lease_idx" ON "OutboxEvent" ("leaseExpiresAt") WHERE status = 'LEASED';
