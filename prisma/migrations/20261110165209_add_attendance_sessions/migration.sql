-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockInNote" TEXT,
    "clockOut" TIMESTAMP(3),
    "clockOutNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing AttendanceRecord becomes its own single session, so hours and
-- notes computed from `sessions` match what the record already showed before this migration.
INSERT INTO "AttendanceSession" ("id", "attendanceRecordId", "clockIn", "clockInNote", "clockOut", "clockOutNote", "createdAt")
SELECT gen_random_uuid()::text, "id", "clockIn", "clockInNote", "clockOut", "clockOutNote", "createdAt"
FROM "AttendanceRecord";
