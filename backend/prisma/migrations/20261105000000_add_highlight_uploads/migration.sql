-- Additive: staging rows for images uploaded in the highlight editor before they are saved.
-- Existing tables are not touched.

-- CreateTable
CREATE TABLE "HighlightUpload" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HighlightUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HighlightUpload_key_key" ON "HighlightUpload"("key");

-- CreateIndex
CREATE INDEX "HighlightUpload_uploadedById_idx" ON "HighlightUpload"("uploadedById");

-- CreateIndex
CREATE INDEX "HighlightUpload_createdAt_idx" ON "HighlightUpload"("createdAt");
