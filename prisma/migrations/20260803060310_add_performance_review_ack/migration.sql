-- CreateTable
CREATE TABLE "PerformanceReviewAck" (
    "id" TEXT NOT NULL,
    "performanceReviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceReviewAck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceReviewAck_performanceReviewId_userId_key" ON "PerformanceReviewAck"("performanceReviewId", "userId");

-- AddForeignKey
ALTER TABLE "PerformanceReviewAck" ADD CONSTRAINT "PerformanceReviewAck_performanceReviewId_fkey" FOREIGN KEY ("performanceReviewId") REFERENCES "PerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReviewAck" ADD CONSTRAINT "PerformanceReviewAck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
