-- CreateEnum
CREATE TYPE "DriverDocumentType" AS ENUM ('LICENSE', 'VEHICLE_REGISTRATION', 'ID_CARD', 'VEHICLE_PHOTO');

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "UserStatus" ADD VALUE 'REJECTED';
ALTER TYPE "UserStatus" ADD VALUE 'SUSPENDED';

-- AlterTable: User — provider identity + verifiable attributes; phone becomes optional
ALTER TABLE "User" ADD COLUMN     "firebaseUid" VARCHAR(128),
ADD COLUMN     "email" VARCHAR(255),
ADD COLUMN     "phoneVerifiedAt" TIMESTAMPTZ(3),
ADD COLUMN     "emailVerifiedAt" TIMESTAMPTZ(3),
ALTER COLUMN "phone" DROP NOT NULL;

-- Backfill: existing users are considered phone-verified (phone was previously required)
UPDATE "User" SET "phoneVerifiedAt" = "createdAt" WHERE "phone" IS NOT NULL AND "phoneVerifiedAt" IS NULL;

-- AlterTable: DriverProfile — KYC onboarding + review fields
ALTER TABLE "DriverProfile" ADD COLUMN     "licensePlate" VARCHAR(32),
ADD COLUMN     "licenseNumber" VARCHAR(64),
ADD COLUMN     "submittedAt" TIMESTAMPTZ(3),
ADD COLUMN     "reviewedAt" TIMESTAMPTZ(3),
ADD COLUMN     "reviewedById" UUID,
ADD COLUMN     "rejectionReason" TEXT;

-- CreateTable: DriverDocument — KYC documents (license, vehicle registration, ID, photos)
CREATE TABLE "DriverDocument" (
    "id" UUID NOT NULL,
    "driverProfileId" UUID NOT NULL,
    "type" "DriverDocumentType" NOT NULL,
    "provider" "ProviderSource" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "clientRequestId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverDocument_storageKey_key" ON "DriverDocument"("storageKey");

-- CreateIndex
CREATE INDEX "DriverDocument_driverProfileId_type_idx" ON "DriverDocument"("driverProfileId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
