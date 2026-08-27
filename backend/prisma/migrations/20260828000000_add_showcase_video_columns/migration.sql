-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "videoThumbnailUrl" TEXT,
ADD COLUMN     "videoStatus" TEXT;

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "videoThumbnailUrl" TEXT,
ADD COLUMN     "videoStatus" TEXT;
