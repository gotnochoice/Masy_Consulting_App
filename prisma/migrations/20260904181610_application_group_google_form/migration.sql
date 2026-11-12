-- AlterTable
ALTER TABLE "ApplicationGroup" ADD COLUMN     "googleFormWebhookToken" TEXT,
ADD COLUMN     "googleFormPublicUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationGroup_googleFormWebhookToken_key" ON "ApplicationGroup"("googleFormWebhookToken");
