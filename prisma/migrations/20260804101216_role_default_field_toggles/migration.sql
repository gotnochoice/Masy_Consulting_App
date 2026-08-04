-- AlterTable
ALTER TABLE "OpenRole" ADD COLUMN     "askExpectedPay" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "askHowHeard" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "askResumeLink" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "askYearsExperience" BOOLEAN NOT NULL DEFAULT true;
