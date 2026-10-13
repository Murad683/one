-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CREATOR';

-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN "createdById" TEXT;

-- CreateIndex
CREATE INDEX "Deliverable_createdById_idx" ON "Deliverable"("createdById");

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
