import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { sendOpsNotification } from "@/lib/email";

const NAME_KEYWORDS = ["name"];
const PHONE_KEYWORDS = ["phone", "whatsapp", "mobile", "number"];
const EMAIL_KEYWORDS = ["email", "e-mail"];
const LOCATION_KEYWORDS = ["location", "where", "city", "address"];

function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return String(value ?? "").trim();
}

function extractField(answers: Record<string, unknown>, keywords: string[]): string | undefined {
  for (const [question, value] of Object.entries(answers)) {
    const lower = question.toLowerCase();
    if (keywords.some((k) => lower.includes(k))) {
      const formatted = formatAnswerValue(value);
      if (formatted) return formatted;
    }
  }
  return undefined;
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

  const name = extractField(answers, NAME_KEYWORDS);
  const phone = extractField(answers, PHONE_KEYWORDS);
  const email = extractField(answers, EMAIL_KEYWORDS);
  const location = extractField(answers, LOCATION_KEYWORDS);

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
