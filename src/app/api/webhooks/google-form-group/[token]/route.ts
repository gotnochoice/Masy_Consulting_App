import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { sendOpsNotification } from "@/lib/email";
import { formatAnswerValue, extractApplicantFields, parseAnswersBody } from "@/lib/google-form-extract";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const group = await db.applicationGroup.findUnique({
    where: { googleFormWebhookToken: token },
    select: { title: true },
  });

  if (!group) {
    return NextResponse.json({ error: "This link is not connected to any application group. Turn on Google Form intake again from the group's page to get a fresh link." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    message: `This webhook is connected to "${group.title}" and is working. It only accepts POST requests from your Google Form's Apps Script trigger, not from a browser visit — seeing this message means the link itself is fine.`,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const group = await db.applicationGroup.findUnique({
    where: { googleFormWebhookToken: token },
    include: {
      clientOrg: true,
      roles: { where: { acceptingApplications: true, mode: "FORMAL" } },
    },
  });
  if (!group) {
    return NextResponse.json({ error: "Unknown webhook" }, { status: 404 });
  }
  if (group.roles.length === 0) {
    return NextResponse.json({ skipped: true, reason: "No roles in this group are accepting applications" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const answers = parseAnswersBody(body);

  // Which role is this for? Look for an answer whose value exactly matches one of the
  // group's role titles -- this is what a "Which role are you applying for?" question,
  // with the role titles as its options, resolves to.
  let matchedRoleId: string | null = null;
  let rolePickerQuestion: string | null = null;
  for (const [question, value] of Object.entries(answers)) {
    const formatted = formatAnswerValue(value).trim().toLowerCase();
    const found = group.roles.find((r) => r.title.trim().toLowerCase() === formatted);
    if (found) {
      matchedRoleId = found.id;
      rolePickerQuestion = question;
      break;
    }
  }
  if (!matchedRoleId) {
    return NextResponse.json(
      {
        error:
          `Could not tell which role this application is for. Add a question to your Google Form whose answer ` +
          `options exactly match your roles' titles: ${group.roles.map((r) => `"${r.title}"`).join(", ")}.`,
      },
      { status: 400 },
    );
  }
  const role = group.roles.find((r) => r.id === matchedRoleId)!;

  const claimed = new Set<string>();
  if (rolePickerQuestion) claimed.add(rolePickerQuestion);
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
      notes: answerLines.length ? `Submitted via Google Form ("${group.title}"):\n\n${answerLines.join("\n")}` : null,
    },
  });

  const origin = await getOrigin();
  await sendOpsNotification(
    `New Google Form application: ${role.title} at ${group.clientOrg.name}`,
    `${name ?? "An applicant"} applied via Google Form for ${role.title} (${group.clientOrg.name}), via the ` +
      `"${group.title}" application link.\n\n` +
      `${phone ? `Phone: ${phone}\n` : ""}` +
      `${email ? `Email: ${email}\n` : ""}` +
      `${location ? `Location: ${location}\n` : ""}` +
      `\nView: ${origin}/ops/recruitment/${role.id}#candidate-${candidate.id}`,
  );

  return NextResponse.json({ ok: true, candidateId: candidate.id, roleId: role.id, roleTitle: role.title });
}
