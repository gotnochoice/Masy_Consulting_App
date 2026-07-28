-- CreateEnum
CREATE TYPE "DocumentRequestType" AS ENUM ('EMPLOYMENT_VERIFICATION', 'REFERENCE', 'SALARY_CONFIRMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentRequestStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'FULFILLED', 'DECLINED');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "dateOfBirth" DATE;

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "clientOrgId" TEXT,
    "authorRole" "Role" NOT NULL,
    "authorLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "DocumentRequestType" NOT NULL,
    "details" TEXT,
    "status" "DocumentRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "responseNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_clientOrgId_fkey" FOREIGN KEY ("clientOrgId") REFERENCES "ClientOrg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
