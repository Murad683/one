-- AlterTable
ALTER TABLE "User" ADD COLUMN "shareLastViewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "viaShare" BOOLEAN NOT NULL DEFAULT false;
