-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "aboutTopLabel" TEXT NOT NULL DEFAULT 'BİZ KİMİK',
    "aboutMainHeading" TEXT NOT NULL DEFAULT 'Brendləri Quranlara Tərəfdaşıq',
    "aboutBodyText" TEXT NOT NULL DEFAULT '',
    "aboutQuote" TEXT NOT NULL DEFAULT '',
    "aboutStats" TEXT NOT NULL DEFAULT '[]',
    "heroHeading1" TEXT NOT NULL DEFAULT '',
    "heroHeading2" TEXT NOT NULL DEFAULT '',
    "heroSubtext" TEXT NOT NULL DEFAULT '',
    "heroCtaText" TEXT NOT NULL DEFAULT 'Bizimlə Əlaqə',
    "heroCtaUrl" TEXT NOT NULL DEFAULT '/contact',
    "heroVideoUrl" TEXT,
    "marqueeWords" TEXT NOT NULL DEFAULT '[]',
    "contactTopLabel" TEXT NOT NULL DEFAULT 'ƏLAQƏ',
    "contactMainHeading" TEXT NOT NULL DEFAULT 'Bizimlə Əlaqə',
    "contactSubtext" TEXT NOT NULL DEFAULT '',
    "companyAddress" TEXT NOT NULL DEFAULT '',
    "companyPhone" TEXT NOT NULL DEFAULT '',
    "companyEmail" TEXT NOT NULL DEFAULT '',
    "companyWorkingHours" TEXT NOT NULL DEFAULT '',
    "googleMapsEmbed" TEXT,
    "packagesTopLabel" TEXT NOT NULL DEFAULT 'QİYMƏT PAKETLƏRİ',
    "packagesMainHeading" TEXT NOT NULL DEFAULT 'Sizin üçün doğru plan',
    "packagesSubtext" TEXT NOT NULL DEFAULT '',
    "portfolioTopLabel" TEXT NOT NULL DEFAULT 'PORTFOLİO',
    "portfolioMainHeading" TEXT NOT NULL DEFAULT '',
    "footerShortText" TEXT NOT NULL DEFAULT '',
    "socialLinks" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT,
    "serviceId" TEXT,
    "serviceName" TEXT,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- AlterTable: Project
ALTER TABLE "Project" RENAME COLUMN "category" TO "categoryLegacy";
ALTER TABLE "Project" ALTER COLUMN "categoryLegacy" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Project" ADD COLUMN "externalUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "year" INTEGER;
ALTER TABLE "Project" ADD COLUMN "serviceTitle" TEXT;

-- AlterTable: Package
ALTER TABLE "Package" ADD COLUMN "priceLabel" TEXT;
UPDATE "Package" SET "priceLabel" = CAST("price" AS TEXT) || ' ₼';
ALTER TABLE "Package" ALTER COLUMN "priceLabel" SET NOT NULL;
ALTER TABLE "Package" DROP COLUMN "price";
ALTER TABLE "Package" DROP COLUMN "currency";
ALTER TABLE "Package" ADD COLUMN "buttonText" TEXT NOT NULL DEFAULT 'Planı Seç';
ALTER TABLE "Package" ADD COLUMN "buttonUrl" TEXT NOT NULL DEFAULT '/contact';
ALTER TABLE "Package" ADD COLUMN "youtubeUrl" TEXT;
ALTER TABLE "Package" ADD COLUMN "detailedDescription" TEXT;
ALTER TABLE "Package" ADD COLUMN "shortDescription" TEXT;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
