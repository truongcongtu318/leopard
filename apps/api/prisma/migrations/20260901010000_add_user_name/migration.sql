-- AlterTable: add optional display name (driver/customer name)
ALTER TABLE "User" ADD COLUMN "name" VARCHAR(120);
