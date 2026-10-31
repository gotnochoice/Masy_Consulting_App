-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "whatsappNumber" TEXT;

-- CreateTable
CREATE TABLE "OnboardingInvite" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingInvite_employeeId_key" ON "OnboardingInvite"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingInvite_token_key" ON "OnboardingInvite"("token");

-- AddForeignKey
ALTER TABLE "OnboardingInvite" ADD CONSTRAINT "OnboardingInvite_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
