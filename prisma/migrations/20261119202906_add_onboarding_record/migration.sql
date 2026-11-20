-- CreateTable
CREATE TABLE "OnboardingRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "recordNumber" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT NOT NULL,

    CONSTRAINT "OnboardingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingRecord_employeeId_version_key" ON "OnboardingRecord"("employeeId", "version");

-- AddForeignKey
ALTER TABLE "OnboardingRecord" ADD CONSTRAINT "OnboardingRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
