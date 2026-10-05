-- AlterTable
ALTER TABLE "OpenRole" ADD COLUMN "askApplicantLocation" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN "location" TEXT;
