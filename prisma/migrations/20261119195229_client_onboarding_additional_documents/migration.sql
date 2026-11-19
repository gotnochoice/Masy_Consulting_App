-- CreateTable
CREATE TABLE "ClientOnboardingDocument" (
    "id" TEXT NOT NULL,
    "clientOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "text" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientOnboardingDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientOnboardingDocument" ADD CONSTRAINT "ClientOnboardingDocument_clientOrgId_fkey" FOREIGN KEY ("clientOrgId") REFERENCES "ClientOrg"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
