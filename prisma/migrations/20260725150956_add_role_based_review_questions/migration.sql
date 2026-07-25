-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "reviewQuestions" JSONB;

-- AlterTable
ALTER TABLE "PerformanceReview" ADD COLUMN     "responses" JSONB;
