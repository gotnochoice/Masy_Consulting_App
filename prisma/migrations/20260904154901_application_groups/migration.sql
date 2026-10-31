-- AlterTable
ALTER TABLE "OpenRole" ADD COLUMN     "applicationGroupId" TEXT;

-- CreateTable
CREATE TABLE "ApplicationGroup" (
    "id" TEXT NOT NULL,
    "clientOrgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralQuestion" (
    "id" TEXT NOT NULL,
    "applicationGroupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'SHORT_TEXT',
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneralQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralAnswer" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "generalQuestionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "GeneralAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationGroup_clientOrgId_slug_key" ON "ApplicationGroup"("clientOrgId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralAnswer_candidateId_generalQuestionId_key" ON "GeneralAnswer"("candidateId", "generalQuestionId");

-- AddForeignKey
ALTER TABLE "OpenRole" ADD CONSTRAINT "OpenRole_applicationGroupId_fkey" FOREIGN KEY ("applicationGroupId") REFERENCES "ApplicationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationGroup" ADD CONSTRAINT "ApplicationGroup_clientOrgId_fkey" FOREIGN KEY ("clientOrgId") REFERENCES "ClientOrg"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralQuestion" ADD CONSTRAINT "GeneralQuestion_applicationGroupId_fkey" FOREIGN KEY ("applicationGroupId") REFERENCES "ApplicationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralAnswer" ADD CONSTRAINT "GeneralAnswer_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralAnswer" ADD CONSTRAINT "GeneralAnswer_generalQuestionId_fkey" FOREIGN KEY ("generalQuestionId") REFERENCES "GeneralQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
