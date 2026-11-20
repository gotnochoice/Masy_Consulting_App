/*
  Warnings:

  - You are about to drop the `CompanySettings` table. If the table is not empty, all the data it contains will be lost.

*/
-- Backfill: the one global offer-letter template (if ever uploaded) becomes every client's
-- starting template, so existing clients don't lose it when this becomes per-client.
UPDATE "ClientOrg"
SET "contractLetterTemplateText" = settings."contractLetterTemplateText",
    "contractLetterTemplateName" = settings."contractLetterTemplateName"
FROM "CompanySettings" settings
WHERE settings.id = 'contract-letter-template'
  AND settings."contractLetterTemplateText" IS NOT NULL
  AND "ClientOrg"."contractLetterTemplateText" IS NULL;

-- DropTable
DROP TABLE "CompanySettings";
