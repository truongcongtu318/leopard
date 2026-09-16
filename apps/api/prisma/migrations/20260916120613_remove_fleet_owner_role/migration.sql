-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('CUSTOMER', 'DRIVER', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "DriverAffiliation" DROP CONSTRAINT "DriverAffiliation_driverProfileId_fkey";

-- DropForeignKey
ALTER TABLE "DriverAffiliation" DROP CONSTRAINT "DriverAffiliation_fleetId_fkey";

-- DropForeignKey
ALTER TABLE "FleetMember" DROP CONSTRAINT "FleetMember_fleetId_fkey";

-- DropForeignKey
ALTER TABLE "FleetMember" DROP CONSTRAINT "FleetMember_userId_fkey";

-- DropTable
DROP TABLE "DriverAffiliation";

-- DropTable
DROP TABLE "Fleet";

-- DropTable
DROP TABLE "FleetMember";

-- DropEnum
DROP TYPE "DriverAffiliationStatus";

-- DropEnum
DROP TYPE "FleetMemberRole";

-- DropEnum
DROP TYPE "FleetMemberStatus";

