import { db } from "@/lib/db";

const NAME_KEYWORDS = ["name"];
const PHONE_KEYWORDS = ["phone", "whatsapp", "mobile", "number"];
const EMAIL_KEYWORDS = ["email", "e-mail"];
const LOCATION_KEYWORDS = ["location", "where", "city", "address"];
const CV_KEYWORDS = ["cv", "resume", "résumé"];
const PHOTO_KEYWORDS = ["photo", "picture", "image", "upload", "sample", "work"];

export function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return String(value ?? "").trim();
}

// A question already matched to one field (e.g. "Email Address" matching email) is
// excluded from later, looser matches (e.g. "address" also matching location) via `claimed`.
export function extractField(answers: Record<string, unknown>, keywords: string[], claimed: Set<string>): string | undefined {
  for (const [question, value] of Object.entries(answers)) {
    if (claimed.has(question)) continue;
    const lower = question.toLowerCase();
    if (keywords.some((k) => lower.includes(k))) {
      const formatted = formatAnswerValue(value);
      if (formatted) {
        claimed.add(question);
        return formatted;
      }
    }
  }
  return undefined;
}

export function extractUrlField(answers: Record<string, unknown>, keywords: string[], claimed: Set<string>): string | undefined {
  for (const [question, value] of Object.entries(answers)) {
    if (claimed.has(question)) continue;
    const lower = question.toLowerCase();
    if (keywords.some((k) => lower.includes(k))) {
      const match = formatAnswerValue(value).match(/https?:\/\/\S+/);
      if (match) {
        claimed.add(question);
        return match[0];
      }
    }
  }
  return undefined;
}

export function extractApplicantFields(answers: Record<string, unknown>, claimed: Set<string>) {
  const name = extractField(answers, NAME_KEYWORDS, claimed);
  const phone = extractField(answers, PHONE_KEYWORDS, claimed);
  const email = extractField(answers, EMAIL_KEYWORDS, claimed);
  const location = extractField(answers, LOCATION_KEYWORDS, claimed);
  // CV extraction runs before photo/work-sample so a "Please upload your CV" question
  // (which also contains the generic "upload" keyword) is claimed as the CV, not a photo.
  const cvUrl = extractUrlField(answers, CV_KEYWORDS, claimed);
  const workSampleUrl = extractUrlField(answers, PHOTO_KEYWORDS, claimed);
  return { name, phone, email, location, cvUrl, workSampleUrl };
}

export function parseAnswersBody(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" && "answers" in body && typeof (body as { answers: unknown }).answers === "object"
    ? ((body as { answers: Record<string, unknown> }).answers ?? {})
    : {};
}

// Re-running a Google Form's "import existing responses" backfill re-posts every historical
// response again, with nothing upstream to tell it's already been imported -- so each run
// would otherwise create a full new set of duplicate candidates. This catches that at the
// point of creation by checking whether this role already has a candidate with the same
// email or phone.
export async function findExistingCandidateForRole(roleId: string, email: string | undefined, phone: string | undefined) {
  if (!email && !phone) return null;
  return db.candidate.findFirst({
    where: {
      openRoleId: roleId,
      OR: [
        ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
    select: { id: true },
  });
}
