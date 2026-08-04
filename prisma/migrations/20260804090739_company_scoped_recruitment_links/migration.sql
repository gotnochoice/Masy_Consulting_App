-- Add MULTIPLE_CHOICE to QuestionType
ALTER TYPE "QuestionType" ADD VALUE 'MULTIPLE_CHOICE';

-- Add options array to RoleQuestion
ALTER TABLE "RoleQuestion" ADD COLUMN "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Add slug to ClientOrg, backfill from name, then enforce NOT NULL + UNIQUE
ALTER TABLE "ClientOrg" ADD COLUMN "slug" TEXT;

UPDATE "ClientOrg"
SET "slug" = lower(regexp_replace(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'));

WITH dupes AS (
  SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY "createdAt") AS rn
  FROM "ClientOrg"
)
UPDATE "ClientOrg" c
SET slug = c.slug || '-' || dupes.rn
FROM dupes
WHERE c.id = dupes.id AND dupes.rn > 1;

ALTER TABLE "ClientOrg" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "ClientOrg_slug_key" ON "ClientOrg"("slug");

-- OpenRole.slug: was globally unique, now unique per client org
DROP INDEX "OpenRole_slug_key";
CREATE UNIQUE INDEX "OpenRole_clientOrgId_slug_key" ON "OpenRole"("clientOrgId", "slug");
