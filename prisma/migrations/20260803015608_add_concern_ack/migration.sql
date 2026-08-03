-- CreateTable
CREATE TABLE "ConcernAck" (
    "id" TEXT NOT NULL,
    "concernId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConcernAck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConcernAck_concernId_userId_key" ON "ConcernAck"("concernId", "userId");

-- AddForeignKey
ALTER TABLE "ConcernAck" ADD CONSTRAINT "ConcernAck_concernId_fkey" FOREIGN KEY ("concernId") REFERENCES "Concern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcernAck" ADD CONSTRAINT "ConcernAck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
