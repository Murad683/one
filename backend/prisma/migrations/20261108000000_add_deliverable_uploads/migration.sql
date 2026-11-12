-- Additive: one row per browser upload of a deliverable file, so a cut-off upload is visible and
-- cleanable. Existing tables are not touched.

-- CreateTable
CREATE TABLE "DeliverableUpload" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "createdById" TEXT,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "DeliverableUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliverableUpload_storageKey_key" ON "DeliverableUpload"("storageKey");

-- CreateIndex
CREATE INDEX "DeliverableUpload_deliverableId_idx" ON "DeliverableUpload"("deliverableId");

-- CreateIndex
CREATE INDEX "DeliverableUpload_status_lastActivityAt_idx" ON "DeliverableUpload"("status", "lastActivityAt");

-- AddForeignKey
ALTER TABLE "DeliverableUpload" ADD CONSTRAINT "DeliverableUpload_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
