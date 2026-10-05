-- CreateEnum
CREATE TYPE "RecruitmentMode" AS ENUM ('FORMAL', 'INFORMAL');

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "workSampleUrl" TEXT;

-- AlterTable
ALTER TABLE "OpenRole" ADD COLUMN     "mode" "RecruitmentMode" NOT NULL DEFAULT 'FORMAL',
ADD COLUMN     "workSampleLabel" TEXT;
