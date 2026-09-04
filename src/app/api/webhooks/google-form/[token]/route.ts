import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { sendOpsNotification } from "@/lib/email";
import { formatAnswerValue, extractApplicantFields, parseAnswersBody } from "@/lib/google-form-extract";

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

  const answers = parseAnswersBody(body);
  const claimed = new Set<string>();
  const { name, phone, email, location, workSampleUrl } = extractApplicantFields(answers, claimed);

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
