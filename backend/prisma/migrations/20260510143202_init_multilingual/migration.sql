/*
  Warnings:

  - You are about to drop the column `description` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `detailedDescription` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `shortDescription` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `aboutDescription` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `aboutMainHeading` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `aboutQuote` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `aboutTeamBadge` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `aboutTeamTitle` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `aboutTopLabel` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `contactAddressLabel` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `contactEmailLabel` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `contactHoursLabel` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `contactInfoTitle` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `contactMainHeading` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `contactPhoneLabel` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `contactSubtext` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `contactTopLabel` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `footerPagesTitle` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `footerShortText` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `footerSocialTitle` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `heroBadge` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `heroHeading1` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `heroHeading2` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `heroSubtext` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `packagesMainHeading` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `packagesSubtext` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `packagesTopLabel` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `portfolioMainHeading` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `portfolioTopLabel` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `TeamMember` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `TeamMember` table. All the data in the column will be lost.
  - Added the required column `description_az` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description_en` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description_ru` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_az` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_en` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_ru` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description_az` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description_en` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description_ru` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title_az` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title_en` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title_ru` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description_az` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description_en` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description_ru` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title_az` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title_en` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title_ru` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_az` to the `TeamMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_en` to the `TeamMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_ru` to the `TeamMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_az` to the `TeamMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_en` to the `TeamMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_ru` to the `TeamMember` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Package" DROP COLUMN "description",
DROP COLUMN "detailedDescription",
DROP COLUMN "features",
DROP COLUMN "name",
DROP COLUMN "shortDescription",
ADD COLUMN     "description_az" TEXT NOT NULL,
ADD COLUMN     "description_en" TEXT NOT NULL,
ADD COLUMN     "description_ru" TEXT NOT NULL,
ADD COLUMN     "detailedDescription_az" TEXT,
ADD COLUMN     "detailedDescription_en" TEXT,
ADD COLUMN     "detailedDescription_ru" TEXT,
ADD COLUMN     "features_az" TEXT[],
ADD COLUMN     "features_en" TEXT[],
ADD COLUMN     "features_ru" TEXT[],
ADD COLUMN     "name_az" TEXT NOT NULL,
ADD COLUMN     "name_en" TEXT NOT NULL,
ADD COLUMN     "name_ru" TEXT NOT NULL,
ADD COLUMN     "shortDescription_az" TEXT,
ADD COLUMN     "shortDescription_en" TEXT,
ADD COLUMN     "shortDescription_ru" TEXT;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "description",
DROP COLUMN "title",
ADD COLUMN     "description_az" TEXT NOT NULL,
ADD COLUMN     "description_en" TEXT NOT NULL,
ADD COLUMN     "description_ru" TEXT NOT NULL,
ADD COLUMN     "title_az" TEXT NOT NULL,
ADD COLUMN     "title_en" TEXT NOT NULL,
ADD COLUMN     "title_ru" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "description",
DROP COLUMN "title",
ADD COLUMN     "description_az" TEXT NOT NULL,
ADD COLUMN     "description_en" TEXT NOT NULL,
ADD COLUMN     "description_ru" TEXT NOT NULL,
ADD COLUMN     "title_az" TEXT NOT NULL,
ADD COLUMN     "title_en" TEXT NOT NULL,
ADD COLUMN     "title_ru" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SiteSettings" DROP COLUMN "aboutDescription",
DROP COLUMN "aboutMainHeading",
DROP COLUMN "aboutQuote",
DROP COLUMN "aboutTeamBadge",
DROP COLUMN "aboutTeamTitle",
DROP COLUMN "aboutTopLabel",
DROP COLUMN "contactAddressLabel",
DROP COLUMN "contactEmailLabel",
DROP COLUMN "contactHoursLabel",
DROP COLUMN "contactInfoTitle",
DROP COLUMN "contactMainHeading",
DROP COLUMN "contactPhoneLabel",
DROP COLUMN "contactSubtext",
DROP COLUMN "contactTopLabel",
DROP COLUMN "footerPagesTitle",
DROP COLUMN "footerShortText",
DROP COLUMN "footerSocialTitle",
DROP COLUMN "heroBadge",
DROP COLUMN "heroHeading1",
DROP COLUMN "heroHeading2",
DROP COLUMN "heroSubtext",
DROP COLUMN "packagesMainHeading",
DROP COLUMN "packagesSubtext",
DROP COLUMN "packagesTopLabel",
DROP COLUMN "portfolioMainHeading",
DROP COLUMN "portfolioTopLabel",
ADD COLUMN     "aboutDescription_az" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "aboutDescription_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "aboutDescription_ru" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "aboutMainHeading_az" TEXT NOT NULL DEFAULT 'Brendləri Quranlara Tərəfdaşıq',
ADD COLUMN     "aboutMainHeading_en" TEXT NOT NULL DEFAULT 'Partners to Brand Creators',
ADD COLUMN     "aboutMainHeading_ru" TEXT NOT NULL DEFAULT 'Партнеры создателей брендов',
ADD COLUMN     "aboutQuote_az" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "aboutQuote_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "aboutQuote_ru" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "aboutTeamBadge_az" TEXT NOT NULL DEFAULT 'KOMANDAMIZ',
ADD COLUMN     "aboutTeamBadge_en" TEXT NOT NULL DEFAULT 'OUR TEAM',
ADD COLUMN     "aboutTeamBadge_ru" TEXT NOT NULL DEFAULT 'НАША КОМАНДА',
ADD COLUMN     "aboutTeamTitle_az" TEXT NOT NULL DEFAULT 'Kreativ Zehinlər',
ADD COLUMN     "aboutTeamTitle_en" TEXT NOT NULL DEFAULT 'Creative Minds',
ADD COLUMN     "aboutTeamTitle_ru" TEXT NOT NULL DEFAULT 'Креативные Умы',
ADD COLUMN     "aboutTopLabel_az" TEXT NOT NULL DEFAULT 'BİZ KİMİK',
ADD COLUMN     "aboutTopLabel_en" TEXT NOT NULL DEFAULT 'WHO WE ARE',
ADD COLUMN     "aboutTopLabel_ru" TEXT NOT NULL DEFAULT 'КТО МЫ',
ADD COLUMN     "contactAddressLabel_az" TEXT NOT NULL DEFAULT 'ÜNVAN',
ADD COLUMN     "contactAddressLabel_en" TEXT NOT NULL DEFAULT 'ADDRESS',
ADD COLUMN     "contactAddressLabel_ru" TEXT NOT NULL DEFAULT 'АДРЕС',
ADD COLUMN     "contactEmailLabel_az" TEXT NOT NULL DEFAULT 'E-POÇT',
ADD COLUMN     "contactEmailLabel_en" TEXT NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "contactEmailLabel_ru" TEXT NOT NULL DEFAULT 'ЭЛ. ПОЧТА',
ADD COLUMN     "contactHoursLabel_az" TEXT NOT NULL DEFAULT 'İŞ SAATLARI',
ADD COLUMN     "contactHoursLabel_en" TEXT NOT NULL DEFAULT 'WORKING HOURS',
ADD COLUMN     "contactHoursLabel_ru" TEXT NOT NULL DEFAULT 'РАБОЧИЕ ЧАСЫ',
ADD COLUMN     "contactInfoTitle_az" TEXT NOT NULL DEFAULT 'Məlumatlarımız',
ADD COLUMN     "contactInfoTitle_en" TEXT NOT NULL DEFAULT 'Our Details',
ADD COLUMN     "contactInfoTitle_ru" TEXT NOT NULL DEFAULT 'Наши данные',
ADD COLUMN     "contactMainHeading_az" TEXT NOT NULL DEFAULT 'Bizimlə Əlaqə',
ADD COLUMN     "contactMainHeading_en" TEXT NOT NULL DEFAULT 'Contact Us',
ADD COLUMN     "contactMainHeading_ru" TEXT NOT NULL DEFAULT 'Связаться с нами',
ADD COLUMN     "contactPhoneLabel_az" TEXT NOT NULL DEFAULT 'TELEFON',
ADD COLUMN     "contactPhoneLabel_en" TEXT NOT NULL DEFAULT 'PHONE',
ADD COLUMN     "contactPhoneLabel_ru" TEXT NOT NULL DEFAULT 'ТЕЛЕФОН',
ADD COLUMN     "contactSubtext_az" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "contactSubtext_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "contactSubtext_ru" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "contactTopLabel_az" TEXT NOT NULL DEFAULT 'ƏLAQƏ',
ADD COLUMN     "contactTopLabel_en" TEXT NOT NULL DEFAULT 'CONTACT',
ADD COLUMN     "contactTopLabel_ru" TEXT NOT NULL DEFAULT 'КОНТАКТ',
ADD COLUMN     "footerPagesTitle_az" TEXT NOT NULL DEFAULT 'SƏHİFƏLƏR',
ADD COLUMN     "footerPagesTitle_en" TEXT NOT NULL DEFAULT 'PAGES',
ADD COLUMN     "footerPagesTitle_ru" TEXT NOT NULL DEFAULT 'СТРАНИЦЫ',
ADD COLUMN     "footerShortText_az" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "footerShortText_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "footerShortText_ru" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "footerSocialTitle_az" TEXT NOT NULL DEFAULT 'SOSİAL MEDİA',
ADD COLUMN     "footerSocialTitle_en" TEXT NOT NULL DEFAULT 'SOCIAL MEDIA',
ADD COLUMN     "footerSocialTitle_ru" TEXT NOT NULL DEFAULT 'СОЦИАЛЬНЫЕ СЕТИ',
ADD COLUMN     "heroBadge_az" TEXT NOT NULL DEFAULT 'Rəqəmsal İnkişaf Şirkəti',
ADD COLUMN     "heroBadge_en" TEXT NOT NULL DEFAULT 'Digital Development Agency',
ADD COLUMN     "heroBadge_ru" TEXT NOT NULL DEFAULT 'Агентство цифрового развития',
ADD COLUMN     "heroHeading1_az" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "heroHeading1_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "heroHeading1_ru" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "heroHeading2_az" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "heroHeading2_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "heroHeading2_ru" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "heroSubtext_az" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "heroSubtext_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "heroSubtext_ru" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "packagesMainHeading_az" TEXT NOT NULL DEFAULT 'Sizin üçün doğru plan',
ADD COLUMN     "packagesMainHeading_en" TEXT NOT NULL DEFAULT 'Right plan for you',
ADD COLUMN     "packagesMainHeading_ru" TEXT NOT NULL DEFAULT 'Правильный план для вас',
ADD COLUMN     "packagesSubtext_az" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "packagesSubtext_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "packagesSubtext_ru" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "packagesTopLabel_az" TEXT NOT NULL DEFAULT 'QİYMƏT PAKETLƏRİ',
ADD COLUMN     "packagesTopLabel_en" TEXT NOT NULL DEFAULT 'PRICING PACKAGES',
ADD COLUMN     "packagesTopLabel_ru" TEXT NOT NULL DEFAULT 'ЦЕНОВЫЕ ПАКЕТЫ',
ADD COLUMN     "portfolioMainHeading_az" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "portfolioMainHeading_en" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "portfolioMainHeading_ru" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "portfolioTopLabel_az" TEXT NOT NULL DEFAULT 'PORTFOLİO',
ADD COLUMN     "portfolioTopLabel_en" TEXT NOT NULL DEFAULT 'PORTFOLIO',
ADD COLUMN     "portfolioTopLabel_ru" TEXT NOT NULL DEFAULT 'ПОРТФОЛИО';

-- AlterTable
ALTER TABLE "TeamMember" DROP COLUMN "name",
DROP COLUMN "role",
ADD COLUMN     "name_az" TEXT NOT NULL,
ADD COLUMN     "name_en" TEXT NOT NULL,
ADD COLUMN     "name_ru" TEXT NOT NULL,
ADD COLUMN     "role_az" TEXT NOT NULL,
ADD COLUMN     "role_en" TEXT NOT NULL,
ADD COLUMN     "role_ru" TEXT NOT NULL;
