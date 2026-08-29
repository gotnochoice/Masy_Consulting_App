import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { sendOpsNotification } from "@/lib/email";

const NAME_KEYWORDS = ["name"];
const PHONE_KEYWORDS = ["phone", "whatsapp", "mobile", "number"];
const EMAIL_KEYWORDS = ["email", "e-mail"];
const LOCATION_KEYWORDS = ["location", "where", "city", "address"];
const PHOTO_KEYWORDS = ["photo", "picture", "image", "upload", "sample", "work"];

function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return String(value ?? "").trim();
}

// A question already matched to one field (e.g. "Email Address" matching email) is
// excluded from later, looser matches (e.g. "address" also matching location) via `claimed`.
function extractField(answers: Record<string, unknown>, keywords: string[], claimed: Set<string>): string | undefined {
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

function extractPhotoUrl(answers: Record<string, unknown>, claimed: Set<string>): string | undefined {
  for (const [question, value] of Object.entries(answers)) {
    if (claimed.has(question)) continue;
    const lower = question.toLowerCase();
    if (PHOTO_KEYWORDS.some((k) => lower.includes(k))) {
      const match = formatAnswerValue(value).match(/https?:\/\/\S+/);
      if (match) {
        claimed.add(question);
        return match[0];
      }
    }
  }
  return undefined;
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const role = await db.openRole.findUnique({ where: { googleFormWebhookToken: token }, select: { title: true } });

  if (!role) {
    return NextResponse.json({ error: "This link is not connected to any role. Turn on Google Form intake again from the role's settings to get a fresh link." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    message: `This webhook is connected to "${role.title}" and is working. It only accepts POST requests from your Google Form's Apps Script trigger, not from a browser visit — seeing this message means the link itself is fine.`,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const role = await db.openRole.findUnique({
    where: { googleFormWebhookToken: token },
    include: { clientOrg: true },
  });
  if (!role) {
    return NextResponse.json({ error: "Unknown webhook" }, { status: 404 });
  }
  if (!role.acceptingApplications) {
    return NextResponse.json({ skipped: true, reason: "Role is not accepting applications" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const answers =
    body && typeof body === "object" && "answers" in body && typeof (body as { answers: unknown }).answers === "object"
      ? ((body as { answers: Record<string, unknown> }).answers ?? {})
      : {};

  const claimed = new Set<string>();
  const name = extractField(answers, NAME_KEYWORDS, claimed);
  const phone = extractField(answers, PHONE_KEYWORDS, claimed);
  const email = extractField(answers, EMAIL_KEYWORDS, claimed);
  const location = extractField(answers, LOCATION_KEYWORDS, claimed);
  const workSampleUrl = extractPhotoUrl(answers, claimed);

  if (!name && !phone && !email) {
    return NextResponse.json(
      { error: "Could not find a name, phone, or email in the submitted answers" },
      { status: 400 },
    );
  }

  const answerLines = Object.entries(answers).map(([question, value]) => `${question}: ${formatAnswerValue(value)}`);

  const candidate = await db.candidate.create({
    data: {
      openRoleId: role.id,
      name: name ?? "Google Form applicant",
      email: email || null,
      phone: phone || null,
      location: location || null,
      workSampleUrl: workSampleUrl || null,
      source: "GOOGLE_FORM",
      stage: "APPLIED",
      notes: answerLines.length ? `Submitted via Google Form:\n\n${answerLines.join("\n")}` : null,
    },
  });

  const origin = await getOrigin();
  await sendOpsNotification(
    `New Google Form application: ${role.title} at ${role.clientOrg.name}`,
    `${name ?? "An applicant"} applied via Google Form for ${role.title} (${role.clientOrg.name}).\n\n` +
      `${phone ? `Phone: ${phone}\n` : ""}` +
      `${email ? `Email: ${email}\n` : ""}` +
      `${location ? `Location: ${location}\n` : ""}` +
      `\nView: ${origin}/ops/recruitment/${role.id}#candidate-${candidate.id}`,
  );

  return NextResponse.json({ ok: true, candidateId: candidate.id });
}
