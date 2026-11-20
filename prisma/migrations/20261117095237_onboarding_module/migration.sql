-- CreateEnum
CREATE TYPE "OnboardingStepType" AS ENUM ('PERSONAL_DETAILS', 'IDENTITY_DOCUMENTS', 'GUARANTORS', 'ACKNOWLEDGMENTS', 'SIGNATURE', 'PROPERTY_HANDOVER');

-- CreateEnum
CREATE TYPE "OnboardingStepStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'NEEDS_CORRECTION', 'VERIFIED');

-- CreateEnum
CREATE TYPE "CountersignerRole" AS ENUM ('FOUNDER_OR_CLIENT_ADMIN', 'HR_MASY');

-- CreateEnum
CREATE TYPE "IdDocumentType" AS ENUM ('PASSPORT', 'DRIVERS_LICENSE');

-- CreateEnum
CREATE TYPE "BankNameMatchStatus" AS ENUM ('UNVERIFIED', 'MATCHED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "GuarantorVerificationMethod" AS ENUM ('PHONE_CALL', 'EMAIL', 'OTHER');

-- CreateEnum
CREATE TYPE "GuarantorVerificationResult" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "AcknowledgmentDocumentType" AS ENUM ('EMPLOYMENT_AGREEMENT', 'HANDBOOK', 'PRIVACY_NOTICE');

-- CreateEnum
CREATE TYPE "SignatureDocumentType" AS ENUM ('EMPLOYMENT_AGREEMENT', 'HANDBOOK', 'PROPERTY_HANDOVER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ISSUED', 'RETURNED', 'LOST', 'DAMAGED', 'IN_REPAIR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmployeeDocumentCategory" ADD VALUE 'PROOF_OF_ADDRESS';
ALTER TYPE "EmployeeDocumentCategory" ADD VALUE 'NIN_SLIP';

-- AlterTable
ALTER TABLE "ClientOrg" ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "companyLegalName" TEXT,
ADD COLUMN     "contractLetterTemplateName" TEXT,
ADD COLUMN     "contractLetterTemplateText" TEXT,
ADD COLUMN     "employmentAgreementTemplate" TEXT,
ADD COLUMN     "employmentAgreementVersion" TEXT DEFAULT '1.0',
ADD COLUMN     "handbookText" TEXT,
ADD COLUMN     "handbookVersion" TEXT DEFAULT '1.0',
ADD COLUMN     "letterheadLogoUrl" TEXT,
ADD COLUMN     "onboardingCountersignerRole" "CountersignerRole" NOT NULL DEFAULT 'FOUNDER_OR_CLIENT_ADMIN',
ADD COLUMN     "privacyNoticeText" TEXT,
ADD COLUMN     "privacyNoticeVersion" TEXT DEFAULT '1.0',
ADD COLUMN     "signatoryName" TEXT,
ADD COLUMN     "signatoryTitle" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "bankNameMatchStatus" "BankNameMatchStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "nin" TEXT,
ADD COLUMN     "personalEmail" TEXT,
ADD COLUMN     "preferredName" TEXT,
ADD COLUMN     "shiftDescription" TEXT,
ADD COLUMN     "shiftLabel" TEXT;

-- AlterTable
ALTER TABLE "EmployeeDocument" ADD COLUMN     "documentDate" DATE,
ADD COLUMN     "idDocumentType" "IdDocumentType";

-- CreateTable
CREATE TABLE "OnboardingProcess" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "commencementDate" DATE NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStep" (
    "id" TEXT NOT NULL,
    "onboardingProcessId" TEXT NOT NULL,
    "stepType" "OnboardingStepType" NOT NULL,
    "status" "OnboardingStepStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "correctionReason" TEXT,
    "correctionRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guarantor" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "occupation" TEXT,
    "address" TEXT NOT NULL,
    "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "replacedAt" TIMESTAMP(3),
    "replacementDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guarantor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuarantorVerificationLog" (
    "id" TEXT NOT NULL,
    "guarantorId" TEXT NOT NULL,
    "verifiedById" TEXT NOT NULL,
    "method" "GuarantorVerificationMethod" NOT NULL,
    "result" "GuarantorVerificationResult" NOT NULL DEFAULT 'PENDING',
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuarantorVerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAcknowledgment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "documentType" "AcknowledgmentDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "scrolledToEnd" BOOLEAN NOT NULL DEFAULT false,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyTermAcknowledgment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "termKey" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeyTermAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComprehensionQuestion" (
    "id" TEXT NOT NULL,
    "clientOrgId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "choices" TEXT[],
    "correctChoiceIndex" INTEGER NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComprehensionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComprehensionAttempt" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComprehensionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ESignature" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "documentType" "SignatureDocumentType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "typedName" TEXT NOT NULL,
    "signatureImageData" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "documentHash" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countersignedById" TEXT,
    "countersignedAt" TIMESTAMP(3),
    "countersignIpAddress" TEXT,

    CONSTRAINT "ESignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyAsset" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialOrImei" TEXT,
    "accessories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conditionNotes" TEXT,
    "conditionPhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "AssetStatus" NOT NULL DEFAULT 'ISSUED',
    "issueDate" DATE,
    "returnDeadline" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProcess_employeeId_key" ON "OnboardingProcess"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStep_onboardingProcessId_stepType_key" ON "OnboardingStep"("onboardingProcessId", "stepType");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAcknowledgment_employeeId_documentType_version_key" ON "DocumentAcknowledgment"("employeeId", "documentType", "version");

-- CreateIndex
CREATE UNIQUE INDEX "KeyTermAcknowledgment_employeeId_termKey_key" ON "KeyTermAcknowledgment"("employeeId", "termKey");

-- CreateIndex
CREATE UNIQUE INDEX "ESignature_employeeId_documentType_version_key" ON "ESignature"("employeeId", "documentType", "version");

-- AddForeignKey
ALTER TABLE "OnboardingProcess" ADD CONSTRAINT "OnboardingProcess_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStep" ADD CONSTRAINT "OnboardingStep_onboardingProcessId_fkey" FOREIGN KEY ("onboardingProcessId") REFERENCES "OnboardingProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guarantor" ADD CONSTRAINT "Guarantor_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuarantorVerificationLog" ADD CONSTRAINT "GuarantorVerificationLog_guarantorId_fkey" FOREIGN KEY ("guarantorId") REFERENCES "Guarantor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAcknowledgment" ADD CONSTRAINT "DocumentAcknowledgment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyTermAcknowledgment" ADD CONSTRAINT "KeyTermAcknowledgment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprehensionQuestion" ADD CONSTRAINT "ComprehensionQuestion_clientOrgId_fkey" FOREIGN KEY ("clientOrgId") REFERENCES "ClientOrg"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprehensionAttempt" ADD CONSTRAINT "ComprehensionAttempt_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESignature" ADD CONSTRAINT "ESignature_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAsset" ADD CONSTRAINT "CompanyAsset_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
