-- "externalUrl" was auto-derived from the YouTube id and used as the modal's
-- "Canlı Bax" link. It is now a real, admin-entered link (client site /
-- Instagram), so clear the YouTube-derived values.
UPDATE "Project"
SET "externalUrl" = NULL
WHERE "externalUrl" ILIKE '%youtube.com%'
   OR "externalUrl" ILIKE '%youtu.be%';
