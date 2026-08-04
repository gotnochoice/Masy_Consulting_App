-- AlterTable
ALTER TABLE "RoleQuestion" ADD COLUMN     "sectionId" TEXT;

-- CreateTable
CREATE TABLE "QuestionSection" (
    "id" TEXT NOT NULL,
    "openRoleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionSection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuestionSection" ADD CONSTRAINT "QuestionSection_openRoleId_fkey" FOREIGN KEY ("openRoleId") REFERENCES "OpenRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleQuestion" ADD CONSTRAINT "RoleQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "QuestionSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
