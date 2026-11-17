import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  updateLetterhead,
  saveAgreementText,
  draftAgreementWithAi,
  uploadAgreementDocument,
  saveHandbookText,
  draftHandbookWithAi,
  savePrivacyNotice,
  regenerateQuizFromAgreement,
  updateQuizQuestion,
  deleteQuizQuestion,
  markOnboardingContentReviewed,
} from "./actions";
import { LetterheadForm } from "./letterhead-form";
import { DocumentEditor } from "./document-editor";
import { QuizManager } from "./quiz-manager";
import { ReviewGate } from "./review-gate";

const DEFAULT_PRIVACY_NOTICE = `Privacy Notice

What we collect: your legal name, date of birth, contact details, residential address, National
Identification Number (NIN), identity and address documents, guarantor details, bank details, and records of
your attendance, leave, and performance while employed.

Why: to verify your identity, pay you correctly, meet our obligations as an employer, and run day-to-day HR
processes (attendance, leave, performance reviews).

Who sees it: HR staff handling verification see your identity documents and NIN. Your employer sees your
employment terms, performance, and attendance, but not your ID files or full NIN. Nobody else has access.

Retention: identity documents are kept for a limited period after you leave and then deleted, per our
retention policy.

Your rights, under the Nigeria Data Protection Act 2023: you can ask what personal data we hold about you,
ask us to correct it, and ask for a copy of it. Contact HR to exercise these rights.`;

export default async function ClientOnboardingSettingsPage() {
  const session = await requireRole("CLIENT");
  const clientOrgId = session.user.clientOrgId!;

  const [org, questions] = await Promise.all([
    db.clientOrg.findUnique({ where: { id: clientOrgId } }),
    db.comprehensionQuestion.findMany({ where: { clientOrgId }, orderBy: { order: "asc" } }),
  ]);
  if (!org) return null;

  const isReviewed = !!org.onboardingContentReviewedAt;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Onboarding setup</h1>
        <p className="text-sm text-slate">
          This is what every new hire at {org.name} sees and signs before they can start work. Set it up once --
          it applies to everyone you onboard from here on.
        </p>
      </div>

      <ReviewGate
        isReviewed={isReviewed}
        reviewedAt={org.onboardingContentReviewedAt}
        hasAgreement={!!org.employmentAgreementTemplate}
        hasHandbook={!!org.handbookText}
        hasQuiz={questions.length > 0}
        onMarkReviewed={markOnboardingContentReviewed}
      />

      <LetterheadForm
        org={{
          logoUrl: org.logoUrl,
          companyLegalName: org.companyLegalName,
          companyAddress: org.companyAddress,
          signatoryName: org.signatoryName,
          signatoryTitle: org.signatoryTitle,
          onboardingCountersignerRole: org.onboardingCountersignerRole,
        }}
        action={updateLetterhead}
      />

      <DocumentEditor
        title="Employment Agreement"
        helpText="The agreement every new hire reads and signs. Write your own, upload one you already have, or describe your business and let AI draft a starting version -- review and edit before saving."
        currentText={org.employmentAgreementTemplate}
        version={org.employmentAgreementVersion}
        saveAction={saveAgreementText}
        uploadAction={uploadAgreementDocument}
        draftAction={draftAgreementWithAi}
        draftFields="agreement"
      />

      <DocumentEditor
        title="Employee Handbook"
        helpText="Day-to-day expectations: communication, conduct, how the team works. Same options as the agreement."
        currentText={org.handbookText}
        version={org.handbookVersion}
        saveAction={saveHandbookText}
        draftAction={draftHandbookWithAi}
        draftFields="handbook"
      />

      <DocumentEditor
        title="Privacy Notice"
        helpText="What personal data is collected during onboarding, why, and employees' rights. A starting version is provided below -- review it against what you actually collect."
        currentText={org.privacyNoticeText || DEFAULT_PRIVACY_NOTICE}
        version={org.privacyNoticeVersion}
        saveAction={savePrivacyNotice}
      />

      <QuizManager
        questions={questions}
        hasAgreement={!!org.employmentAgreementTemplate}
        regenerateAction={regenerateQuizFromAgreement}
        updateAction={updateQuizQuestion}
        deleteAction={deleteQuizQuestion}
      />
    </div>
  );
}
