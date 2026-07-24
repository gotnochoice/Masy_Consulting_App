CREATE TABLE "ApplicationAttempt" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicationAttempt_ip_createdAt_idx" ON "ApplicationAttempt"("ip", "createdAt");
