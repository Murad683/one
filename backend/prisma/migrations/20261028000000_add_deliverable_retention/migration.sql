-- Video retention: additive, nullable columns. Existing rows keep NULL
-- (the rule does not apply until the retention job stamps them).

-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "firstReadyAt" TIMESTAMP(3);
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "hiddenAt" TIMESTAMP(3);
ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "mediaDeletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deliverable_expiresAt_idx" ON "Deliverable"("expiresAt");
CREATE INDEX IF NOT EXISTS "Deliverable_hiddenAt_idx" ON "Deliverable"("hiddenAt");
