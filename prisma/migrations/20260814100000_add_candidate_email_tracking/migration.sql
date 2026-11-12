-- AlterTable
ALTER TABLE "OpenRole" ADD COLUMN "schedulingLink" TEXT;

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN "rejectionEmailSentAt" TIMESTAMP(3);
ALTER TABLE "Candidate" ADD COLUMN "interviewInviteSentAt" TIMESTAMP(3);
ALTER TABLE "Candidate" ADD COLUMN "offerEmailSentAt" TIMESTAMP(3);
