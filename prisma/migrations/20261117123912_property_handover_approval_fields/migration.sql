-- AlterEnum
ALTER TYPE "AssetStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "CompanyAsset" ADD COLUMN     "employeeDisagreesNote" TEXT,
ADD COLUMN     "employeeDisagreesPhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "managementApprovedAt" TIMESTAMP(3),
ADD COLUMN     "managementApprovedById" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';
