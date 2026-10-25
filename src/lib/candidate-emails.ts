import { db } from "@/lib/db";
import { sendNotification } from "@/lib/email";
import { rejectionEmail, interviewInviteEmail, offerEmail } from "@/lib/candidate-email-templates";

export async function loadCandidateForEmail(candidateId: string) {
  const candidate = await db.candidate.findUnique({
    where: { id: candidateId },
    include: { openRole: { include: { clientOrg: true } } },
  });
  if (!candidate) throw new Error("Candidate not found");
  if (!candidate.email) throw new Error(`${candidate.name} has no email address on file`);
  return candidate;
}

export async function sendRejectionEmailCore(candidateId: string, actorId: string) {
  const candidate = await loadCandidateForEmail(candidateId);
  const { subject, body } = rejectionEmail(candidate.name, candidate.openRole.title, candidate.openRole.clientOrg.name);
  await sendNotification(candidate.email!, subject, body);
  await db.candidate.update({ where: { id: candidateId }, data: { rejectionEmailSentAt: new Date() } });
  await db.auditLog.create({
    data: { actorId, action: "candidate.send_rejection_email", targetType: "Candidate", targetId: candidateId },
  });
}

export async function sendInterviewInviteEmailCore(candidateId: string, actorId: string) {
  const candidate = await loadCandidateForEmail(candidateId);
  const { subject, body } = interviewInviteEmail(
    candidate.name,
    candidate.openRole.title,
    candidate.openRole.clientOrg.name,
    candidate.openRole.schedulingLink,
    candidate.openRole.customInterviewMessage,
  );
  await sendNotification(candidate.email!, subject, body);
  await db.candidate.update({ where: { id: candidateId }, data: { interviewInviteSentAt: new Date() } });
  await db.auditLog.create({
    data: { actorId, action: "candidate.send_interview_invite", targetType: "Candidate", targetId: candidateId },
  });
}

export async function sendOfferEmailCore(candidateId: string, actorId: string) {
  const candidate = await loadCandidateForEmail(candidateId);
  const { subject, body } = offerEmail(
    candidate.name,
    candidate.openRole.title,
    candidate.openRole.clientOrg.name,
    candidate.openRole.customOfferMessage,
  );
  await sendNotification(candidate.email!, subject, body);
  await db.candidate.update({ where: { id: candidateId }, data: { offerEmailSentAt: new Date() } });
  await db.auditLog.create({
    data: { actorId, action: "candidate.send_offer_email", targetType: "Candidate", targetId: candidateId },
  });
}

// Shared by both the Ops and Client stage-change actions so a candidate gets the matching
// email automatically on the FIRST time they reach that stage, regardless of who moved them.
// Re-entering a stage later never re-sends -- that stays a manual "Resend" from the card.
// A send failure must never block the stage move itself, so it's caught and logged here.
export async function autoSendStageEmail(
  candidateId: string,
  actorId: string,
  stage: string,
  before: { email: string | null; rejectionEmailSentAt: Date | null; interviewInviteSentAt: Date | null; offerEmailSentAt: Date | null } | null,
) {
  if (!before?.email) return;
  try {
    if (stage === "REJECTED" && !before.rejectionEmailSentAt) {
      await sendRejectionEmailCore(candidateId, actorId);
    } else if (stage === "INTERVIEWING" && !before.interviewInviteSentAt) {
      await sendInterviewInviteEmailCore(candidateId, actorId);
    } else if (stage === "OFFER" && !before.offerEmailSentAt) {
      await sendOfferEmailCore(candidateId, actorId);
    }
  } catch (err) {
    console.error(`[autoSendStageEmail] auto-send failed for candidate ${candidateId}:`, err);
  }
}
