-- Add fields to store an uploaded CV/resume PDF directly, instead of relying on an
-- externally hosted link (e.g. Google Drive links Ops doesn't have access to).
ALTER TABLE "Candidate" ADD COLUMN "resumeFileName" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "resumeFileType" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "resumeFileData" BYTEA;
