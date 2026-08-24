-- DropIndex
DROP INDEX "ApplicationAttempt_ip_createdAt_idx";

-- AlterTable
ALTER TABLE "ApplicationAttempt" ADD COLUMN     "openRoleId" TEXT;

-- CreateIndex
CREATE INDEX "ApplicationAttempt_ip_openRoleId_createdAt_idx" ON "ApplicationAttempt"("ip", "openRoleId", "createdAt");
