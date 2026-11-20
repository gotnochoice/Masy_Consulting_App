import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { requirePrivacyConsent } from "@/lib/onboarding-gate";
import { db } from "@/lib/db";
import { OnboardingStepStatusBadge } from "@/components/onboarding-step-status-badge";
import { OnboardingStepNav } from "@/components/onboarding-step-nav";
import { KEY_TERM_ITEMS } from "@/lib/onboarding";
import { AcknowledgmentsFlow } from "./acknowledgments-flow";

export default async function AcknowledgmentsStepPage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/me/profile");
  await requirePrivacyConsent(employeeId);

  const employee = await db.employee.findUnique({ where: { id: employeeId }, include: { clientOrg: true } });
  if (!employee) redirect("/me/profile");

  const process = await db.onboardingProcess.findUnique({ where: { employeeId }, include: { steps: true } });
  if (!process) redirect("/me/profile");

  const step = process.steps.find((s) => s.stepType === "ACKNOWLEDGMENTS");
  if (!step) redirect("/me/onboarding");

  const { clientOrg } = employee;

  // Whether the client has clicked "mark it ready" on their own settings page doesn't block
  // this step anymore -- it never told the employee anything about what's actually there, just
  // whether the client remembered to flick a switch. AcknowledgmentsFlow already skips whichever
  // of agreement/handbook/privacy-notice/quiz the client never set up; that's the real signal.

  const [acks, keyTermCount, questions, additionalDocuments] = await Promise.all([
    db.documentAcknowledgment.findMany({ where: { employeeId } }),
    db.keyTermAcknowledgment.count({ where: { employeeId } }),
    db.comprehensionQuestion.findMany({ where: { clientOrgId: clientOrg.id, active: true }, orderBy: { order: "asc" } }),
    db.clientOnboardingDocument.findMany({ where: { clientOrgId: clientOrg.id }, orderBy: { createdAt: "asc" } }),
  ]);

  const findAck = (type: string, version: string | null) =>
    !!acks.find((a) => a.documentType === type && a.version === version && a.acknowledgedAt);

  return (
    <div className="max-w-2xl space-y-6">
      <OnboardingStepNav current="ACKNOWLEDGMENTS" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Agreement, handbook & quiz</h1>
          <p className="text-sm text-slate">Read each document fully, confirm the key terms, then pass a short check.</p>
        </div>
        <OnboardingStepStatusBadge status={step.status} />
      </div>

      {additionalDocuments.length > 0 && (
        <div className="space-y-2 rounded-card border border-border bg-paper-2 p-4">
          <p className="text-xs font-medium text-slate-light">Additional documents from {clientOrg.name}</p>
          <ul className="space-y-1">
            {additionalDocuments.map((doc) =>
              doc.fileUrl ? (
                <li key={doc.id} className="text-sm">
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-indigo hover:underline">
                    {doc.name}
                  </a>
                </li>
              ) : (
                <li key={doc.id} className="text-sm">
                  <details>
                    <summary className="cursor-pointer text-indigo hover:underline">{doc.name}</summary>
                    <p className="mt-2 whitespace-pre-wrap rounded-btn border border-border bg-paper p-3 text-xs leading-relaxed text-slate">
                      {doc.text}
                    </p>
                  </details>
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      {step.status === "NEEDS_CORRECTION" && step.correctionReason && (
        <div className="rounded-card border border-orange/30 bg-orange/5 px-5 py-4 text-sm text-orange">
          Our team asked for a correction: {step.correctionReason}
        </div>
      )}

      {step.status === "VERIFIED" ? (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Verified -- this step is locked.</p>
        </div>
      ) : step.status === "SUBMITTED" ? (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Submitted -- waiting on our team to verify.</p>
        </div>
      ) : (
        <AcknowledgmentsFlow
          initialDone={{
            agreement: findAck("EMPLOYMENT_AGREEMENT", clientOrg.employmentAgreementVersion),
            handbook: findAck("HANDBOOK", clientOrg.handbookVersion),
            privacy: findAck("PRIVACY_NOTICE", clientOrg.privacyNoticeVersion),
            keyTerms: keyTermCount >= KEY_TERM_ITEMS.length + 1,
          }}
          documents={{
            EMPLOYMENT_AGREEMENT: {
              title: "Employment Agreement",
              text: clientOrg.employmentAgreementTemplate || "",
              version: clientOrg.employmentAgreementVersion || "1.0",
              done: findAck("EMPLOYMENT_AGREEMENT", clientOrg.employmentAgreementVersion),
            },
            HANDBOOK: {
              title: "Employee Handbook",
              text: clientOrg.handbookText || "",
              version: clientOrg.handbookVersion || "1.0",
              done: findAck("HANDBOOK", clientOrg.handbookVersion),
            },
            PRIVACY_NOTICE: {
              title: "Privacy Notice",
              text: clientOrg.privacyNoticeText || "",
              version: clientOrg.privacyNoticeVersion || "1.0",
              done: findAck("PRIVACY_NOTICE", clientOrg.privacyNoticeVersion),
            },
          }}
          shiftLabel={employee.shiftLabel}
          shiftDescription={employee.shiftDescription}
          questions={questions.map((q) => ({ id: q.id, question: q.question, choices: q.choices }))}
        />
      )}
    </div>
  );
}
