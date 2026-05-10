/*
  Warnings:

  - You are about to drop the column `detailedDescription` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `shortDescription` on the `Package` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Package" DROP COLUMN "detailedDescription",
DROP COLUMN "shortDescription";
