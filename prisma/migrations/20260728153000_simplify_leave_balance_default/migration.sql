-- AlterTable
ALTER TABLE "ClientOrg" DROP COLUMN "leaveAllowanceDays";

-- AlterTable
ALTER TABLE "Employee" ALTER COLUMN "leaveBalanceDays" SET DEFAULT 0;
