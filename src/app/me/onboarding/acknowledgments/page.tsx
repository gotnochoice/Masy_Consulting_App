import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { requirePrivacyConsent } from "@/lib/onboarding-gate";
import { db } from "@/lib/db";
import { OnboardingStepStatusBadge } from "@/components/onboarding-step-status-badge";
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

  if (step.status === "NOT_STARTED" || step.status === "IN_PROGRESS" || step.status === "NEEDS_CORRECTION") {
    if (!clientOrg.onboardingContentReviewedAt) {
      return (
        <div className="max-w-lg space-y-6">
          <div>
            <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
            <h1 className="text-2xl font-bold tracking-tight text-ink">Agreement, handbook & quiz</h1>
          </div>
          <div className="rounded-card border border-orange/30 bg-orange/5 px-5 py-4 text-sm text-orange">
            Your employer hasn&rsquo;t finished setting up onboarding content yet. Check back shortly, or contact HR.
          </div>
        </div>
      );
    }
  }

  const [acks, keyTermCount, questions] = await Promise.all([
    db.documentAcknowledgment.findMany({ where: { employeeId } }),
    db.keyTermAcknowledgment.count({ where: { employeeId } }),
    db.comprehensionQuestion.findMany({ where: { clientOrgId: clientOrg.id, active: true }, orderBy: { order: "asc" } }),
  ]);

  const findAck = (type: string, version: string | null) =>
    !!acks.find((a) => a.documentType === type && a.version === version && a.acknowledgedAt);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Agreement, handbook & quiz</h1>
          <p className="text-sm text-slate">Read each document fully, confirm the key terms, then pass a short check.</p>
        </div>
        <OnboardingStepStatusBadge status={step.status} />
      </div>

      {step.status === "NEEDS_CORRECTION" && step.correctionReason && (
        <div className="rounded-card border border-orange/30 bg-orange/5 px-5 py-4 text-sm text-orange">
          HR asked for a correction: {step.correctionReason}
        </div>
      )}

      {step.status === "VERIFIED" ? (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Verified -- this step is locked.</p>
        </div>
      ) : step.status === "SUBMITTED" ? (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Submitted -- waiting on HR to verify.</p>
        </div>
      ) : (
        <AcknowledgmentsFlow
          initialDone={{
            agreement: findAck("EMPLOYMENT_AGREEMENT", clientOrg.employmentAgreementVersion),
            handbook: findAck("HANDBOOK", clientOrg.handbookVersion),
            privacy: findAck("PRIVACY_NOTICE", clientOrg.privacyNoticeVersion),
            keyTerms: keyTermCount >= 12,
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
