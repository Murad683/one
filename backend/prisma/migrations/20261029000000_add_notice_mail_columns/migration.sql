-- Retention notice mails: additive, nullable columns. Existing rows keep NULL.

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailBouncedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "infoMailSentTo" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastNoticeMailAt" TIMESTAMP(3);

ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "notice7SentAt" TIMESTAMP(3);
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "notice1SentAt" TIMESTAMP(3);
