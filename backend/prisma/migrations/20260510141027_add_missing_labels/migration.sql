-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "aboutTeamBadge" TEXT NOT NULL DEFAULT 'KOMANDAMIZ',
ADD COLUMN     "aboutTeamTitle" TEXT NOT NULL DEFAULT 'Kreativ Zehinlər',
ADD COLUMN     "contactAddressLabel" TEXT NOT NULL DEFAULT 'ÜNVAN',
ADD COLUMN     "contactEmailLabel" TEXT NOT NULL DEFAULT 'E-POÇT',
ADD COLUMN     "contactHoursLabel" TEXT NOT NULL DEFAULT 'İŞ SAATLARI',
ADD COLUMN     "contactInfoTitle" TEXT NOT NULL DEFAULT 'Məlumatlarımız',
ADD COLUMN     "contactPhoneLabel" TEXT NOT NULL DEFAULT 'TELEFON',
ADD COLUMN     "footerPagesTitle" TEXT NOT NULL DEFAULT 'SƏHİFƏLƏR',
ADD COLUMN     "footerSocialTitle" TEXT NOT NULL DEFAULT 'SOSİAL MEDİA';
