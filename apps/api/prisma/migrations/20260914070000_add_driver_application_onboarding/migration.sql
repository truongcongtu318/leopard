-- CreateEnum
CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING_REVIEW', 'VERIFIED', 'ACTION_REQUIRED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DriverApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DriverLegalModel" AS ENUM ('FLEET_AFFILIATED', 'EMPLOYEE', 'INDEPENDENT_OPERATOR');

-- CreateEnum
CREATE TYPE "DriverAffiliationStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- AlterEnum
ALTER TYPE "DriverDocumentType" ADD VALUE 'INSPECTION_CERTIFICATE';
ALTER TYPE "DriverDocumentType" ADD VALUE 'MANDATORY_INSURANCE';

-- AlterTable
ALTER TABLE "DriverDocument" ADD COLUMN     "documentNumber" VARCHAR(64),
ADD COLUMN     "expiresAt" TIMESTAMPTZ(3),
ADD COLUMN     "holderName" VARCHAR(120),
ADD COLUMN     "issuedAt" TIMESTAMPTZ(3),
ADD COLUMN     "reasonCode" VARCHAR(64),
ADD COLUMN     "reviewStatus" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
ADD COLUMN     "reviewedAt" TIMESTAMPTZ(3),
ADD COLUMN     "reviewedById" UUID;

-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "fleetCode" VARCHAR(64),
ADD COLUMN     "operatingCity" VARCHAR(120);

-- CreateTable
CREATE TABLE "DriverApplication" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "legalModel" "DriverLegalModel" NOT NULL DEFAULT 'FLEET_AFFILIATED',
    "status" "DriverApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "operatingCity" VARCHAR(120),
    "fleetCode" VARCHAR(64),
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'VAN',
    "licensePlate" VARCHAR(32),
    "licenseNumber" VARCHAR(64),
    "currentRevision" INTEGER NOT NULL DEFAULT 1,
    "rejectionReason" TEXT,
    "decisionReasonCode" VARCHAR(64),
    "submittedAt" TIMESTAMPTZ(3),
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewedById" UUID,
    "approvedAt" TIMESTAMPTZ(3),
    "rejectedAt" TIMESTAMPTZ(3),
    "withdrawnAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverAffiliation" (
    "id" UUID NOT NULL,
    "driverProfileId" UUID NOT NULL,
    "fleetId" UUID NOT NULL,
    "relationshipType" TEXT NOT NULL DEFAULT 'FLEET_MEMBER',
    "status" "DriverAffiliationStatus" NOT NULL DEFAULT 'PENDING',
    "validFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMPTZ(3),
    "verifiedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAcceptance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "driverProfileId" UUID,
    "contractVersion" VARCHAR(32) NOT NULL,
    "documentHash" VARCHAR(128) NOT NULL,
    "pdfStorageKey" VARCHAR(500) NOT NULL,
    "signMethod" TEXT NOT NULL DEFAULT 'OTP',
    "authEventId" VARCHAR(128),
    "signedPhone" VARCHAR(32),
    "signedByName" VARCHAR(120) NOT NULL,
    "signedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidenceMetadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "noticeType" VARCHAR(64) NOT NULL,
    "noticeVersion" VARCHAR(32) NOT NULL,
    "purpose" VARCHAR(128) NOT NULL,
    "decision" BOOLEAN NOT NULL DEFAULT true,
    "capturedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMPTZ(3),
    "evidence" JSONB,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverApplication_userId_status_idx" ON "DriverApplication"("userId", "status");

-- CreateIndex
CREATE INDEX "DriverApplication_status_submittedAt_idx" ON "DriverApplication"("status", "submittedAt" DESC);

-- CreateIndex
CREATE INDEX "DriverAffiliation_fleetId_status_idx" ON "DriverAffiliation"("fleetId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DriverAffiliation_driverProfileId_fleetId_key" ON "DriverAffiliation"("driverProfileId", "fleetId");

-- CreateIndex
CREATE INDEX "ContractAcceptance_userId_contractVersion_idx" ON "ContractAcceptance"("userId", "contractVersion");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_noticeType_idx" ON "ConsentRecord"("userId", "noticeType");

-- AddForeignKey
ALTER TABLE "DriverApplication" ADD CONSTRAINT "DriverApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverAffiliation" ADD CONSTRAINT "DriverAffiliation_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverAffiliation" ADD CONSTRAINT "DriverAffiliation_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES "Fleet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
