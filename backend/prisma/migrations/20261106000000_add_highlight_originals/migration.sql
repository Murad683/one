-- Additive: keep the untouched original of highlight images for downloads.
-- Existing rows stay as they are (NULL = only the optimized copy exists).

-- AlterTable
ALTER TABLE "HighlightItem" ADD COLUMN "originalUrl" TEXT;

-- AlterTable
ALTER TABLE "HighlightUpload" ADD COLUMN "originalKey" TEXT;
