-- AlterTable
ALTER TABLE "User" ADD COLUMN "shareToken" TEXT,
ADD COLUMN "shareTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_shareToken_key" ON "User"("shareToken");
