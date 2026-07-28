/*
  Warnings:

  - You are about to drop the column `reviewQuestions` on the `Employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "reviewQuestions",
ADD COLUMN     "reviewTemplate" JSONB;
