-- AlterTable
ALTER TABLE "OpenRole" ADD COLUMN "shortCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OpenRole_shortCode_key" ON "OpenRole"("shortCode");
