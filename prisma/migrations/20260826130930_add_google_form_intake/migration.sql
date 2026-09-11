-- AlterEnum
ALTER TYPE "CandidateSource" ADD VALUE 'GOOGLE_FORM';

-- AlterTable
ALTER TABLE "OpenRole" ADD COLUMN     "googleFormWebhookToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OpenRole_googleFormWebhookToken_key" ON "OpenRole"("googleFormWebhookToken");
