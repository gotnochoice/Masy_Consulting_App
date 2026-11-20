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

// The Apps Script sends the response's own submission time separately from the answers
// (it isn't a question/answer itself) so a candidate's "applied" date reflects when they
// actually filled out the form, not whenever the webhook happened to run -- which, for a
// backfill, can be long after the real submission.
export function parseSubmittedAt(body: unknown): Date | undefined {
  if (!body || typeof body !== "object" || !("timestamp" in body)) return undefined;
  const raw = (body as { timestamp: unknown }).timestamp;
  if (typeof raw !== "string") return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Re-running a Google Form's "import existing responses" backfill re-posts every historical
// response again, with nothing upstream to tell it's already been imported -- so each run
// would otherwise create a full new set of duplicate candidates. This catches that at the
// point of creation by checking whether this role already has a GOOGLE_FORM candidate with
// the same email or phone. Scoped to GOOGLE_FORM only: if a WEBSITE applicant happens to
// share an email/phone with a different real person applying via Google Form (a shared
// family line, say), matching across sources would silently skip creating that second
// person's application entirely -- never even a record of them, which is worse than a
// duplicate. Comparing only against other Google Form entries means this only ever catches
// an actual replay of the same Google Form response.
export async function findExistingCandidateForRole(roleId: string, email: string | undefined, phone: string | undefined) {
  if (!email && !phone) return null;
  return db.candidate.findFirst({
    where: {
      openRoleId: roleId,
      source: "GOOGLE_FORM",
      OR: [
        ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
    select: { id: true, createdAt: true },
  });
}
