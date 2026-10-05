-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "convertedEmployeeId" TEXT,
ADD COLUMN     "convertedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_convertedEmployeeId_key" ON "Candidate"("convertedEmployeeId");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_convertedEmployeeId_fkey" FOREIGN KEY ("convertedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
