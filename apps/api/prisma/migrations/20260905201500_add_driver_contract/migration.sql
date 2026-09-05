-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "contractSignedAt" TIMESTAMPTZ(3),
ADD COLUMN     "contractVersion" VARCHAR(32);

-- CreateTable
CREATE TABLE "DriverContract" (
    "id" UUID NOT NULL,
    "driverProfileId" UUID NOT NULL,
    "version" VARCHAR(32) NOT NULL,
    "pdfStorageKey" TEXT NOT NULL,
    "signatureStorageKey" TEXT,
    "signedByName" VARCHAR(120) NOT NULL,
    "signedAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverContract_pdfStorageKey_key" ON "DriverContract"("pdfStorageKey");

-- CreateIndex
CREATE UNIQUE INDEX "DriverContract_signatureStorageKey_key" ON "DriverContract"("signatureStorageKey");

-- CreateIndex
CREATE INDEX "DriverContract_driverProfileId_idx" ON "DriverContract"("driverProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverContract_driverProfileId_version_key" ON "DriverContract"("driverProfileId", "version");

-- AddForeignKey
ALTER TABLE "DriverContract" ADD CONSTRAINT "DriverContract_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
