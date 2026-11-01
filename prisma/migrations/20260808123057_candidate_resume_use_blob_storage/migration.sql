-- Move uploaded CV/resume storage out of Postgres and into Vercel Blob: the file
-- itself now lives in Blob storage, this table only keeps the resulting URL.
ALTER TABLE "Candidate" DROP COLUMN "resumeFileType";
ALTER TABLE "Candidate" DROP COLUMN "resumeFileData";
ALTER TABLE "Candidate" ADD COLUMN "resumeFileUrl" TEXT;
