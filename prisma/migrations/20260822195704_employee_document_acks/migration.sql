-- CreateTable
CREATE TABLE "EmployeeDocumentAck" (
    "id" TEXT NOT NULL,
    "employeeDocumentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocumentAck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDocumentAck_employeeDocumentId_userId_key" ON "EmployeeDocumentAck"("employeeDocumentId", "userId");

-- AddForeignKey
ALTER TABLE "EmployeeDocumentAck" ADD CONSTRAINT "EmployeeDocumentAck_employeeDocumentId_fkey" FOREIGN KEY ("employeeDocumentId") REFERENCES "EmployeeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocumentAck" ADD CONSTRAINT "EmployeeDocumentAck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
