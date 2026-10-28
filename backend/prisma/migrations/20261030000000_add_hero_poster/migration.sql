-- Additive: first-frame poster shown while the hero video loads.
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "heroPoster" TEXT;
