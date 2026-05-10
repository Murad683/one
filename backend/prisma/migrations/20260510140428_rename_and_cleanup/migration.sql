/*
  Warnings:

  - You are about to drop the column `aboutBodyText` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `TeamMember` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SiteSettings" DROP COLUMN "aboutBodyText",
ADD COLUMN     "aboutDescription" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "heroBadge" TEXT NOT NULL DEFAULT 'Rəqəmsal İnkişaf Şirkəti';

-- AlterTable
ALTER TABLE "TeamMember" DROP COLUMN "bio";
