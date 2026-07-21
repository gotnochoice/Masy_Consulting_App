-- New enums for the application form feature
CREATE TYPE "CandidateSource" AS ENUM ('WEBSITE', 'MASY_SOURCED');
CREATE TYPE "QuestionType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'LINK');

-- Safely evolve CandidateStage: add new values, remap existing rows off the
-- removed ones (SOURCING -> APPLIED, FILLED -> HIRED), then swap the type.
CREATE TYPE "CandidateStage_new" AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEWING', 'OFFER', 'HIRED', 'REJECTED');

ALTER TABLE "Candidate" ADD COLUMN "stage_new" "CandidateStage_new";

UPDATE "Candidate" SET "stage_new" = (
  CASE "stage"::text
    WHEN 'SOURCING' THEN 'APPLIED'
    WHEN 'FILLED' THEN 'HIRED'
    ELSE "stage"::text
  END
)::"CandidateStage_new";

ALTER TABLE "Candidate" ALTER COLUMN "stage_new" SET NOT NULL;
ALTER TABLE "Candidate" ALTER COLUMN "stage_new" SET DEFAULT 'APPLIED';
ALTER TABLE "Candidate" DROP COLUMN "stage";
ALTER TABLE "Candidate" RENAME COLUMN "stage_new" TO "stage";
DROP TYPE "CandidateStage";
ALTER TYPE "CandidateStage_new" RENAME TO "CandidateStage";

-- New Candidate columns
ALTER TABLE "Candidate" ADD COLUMN "email" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "phone" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "resumeLink" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "source" "CandidateSource" NOT NULL DEFAULT 'MASY_SOURCED';

-- New OpenRole columns (slug backfilled for any existing rows, then locked down)
ALTER TABLE "OpenRole" ADD COLUMN "slug" TEXT;
ALTER TABLE "OpenRole" ADD COLUMN "description" TEXT;
ALTER TABLE "OpenRole" ADD COLUMN "acceptingApplications" BOOLEAN NOT NULL DEFAULT true;

UPDATE "OpenRole" SET "slug" = 'role-' || substr(md5(id || random()::text), 1, 10) WHERE "slug" IS NULL;

ALTER TABLE "OpenRole" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "OpenRole_slug_key" ON "OpenRole"("slug");

-- RoleQuestion
CREATE TABLE "RoleQuestion" (
    "id" TEXT NOT NULL,
    "openRoleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'SHORT_TEXT',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleQuestion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RoleQuestion" ADD CONSTRAINT "RoleQuestion_openRoleId_fkey"
  FOREIGN KEY ("openRoleId") REFERENCES "OpenRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CandidateAnswer
CREATE TABLE "CandidateAnswer" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "roleQuestionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "CandidateAnswer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CandidateAnswer" ADD CONSTRAINT "CandidateAnswer_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateAnswer" ADD CONSTRAINT "CandidateAnswer_roleQuestionId_fkey"
  FOREIGN KEY ("roleQuestionId") REFERENCES "RoleQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CandidateAnswer_candidateId_roleQuestionId_key" ON "CandidateAnswer"("candidateId", "roleQuestionId");
