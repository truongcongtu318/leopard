-- AlterTable: add onboarding, consent, and avatar columns to User
ALTER TABLE "User" ADD COLUMN     "avatarMediaId" UUID,
ADD COLUMN     "consentMarketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentServiceAt" TIMESTAMPTZ(3),
ADD COLUMN     "consentTermsAt" TIMESTAMPTZ(3),
ADD COLUMN     "consentThirdParty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardedAt" TIMESTAMPTZ(3);

-- Existing users are considered already onboarded so they are not sent back
-- to the registration screen.
UPDATE "User" SET "onboardedAt" = COALESCE("createdAt", now()) WHERE "onboardedAt" IS NULL;
