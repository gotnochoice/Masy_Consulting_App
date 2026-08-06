"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { sendOpsNotification } from "@/lib/email";

export type ApplyState = { error?: string; success?: boolean; name?: string };

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(1, "Phone is required"),
  yearsExperience: z.string().optional(),
  resumeLink: z.string().url("Enter a full link, starting with https://").optional().or(z.literal("")),
  expectedPay: z.string().optional(),
  howHeard: z.string().optional(),
});

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function submitApplication(
  companySlug: string,
  roleSlug: string,
  _prevState: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  // Honeypot: bots tend to fill every field, real applicants never see this one.
  if (formData.get("hp_gate")) {
    return { success: true };
  }

  const ip = await getClientIp();
  const recentAttempts = await db.applicationAttempt.count({
    where: { ip, createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } },
  });
  if (recentAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { error: "Too many applications submitted recently. Please try again in a little while." };
  }
  await db.applicationAttempt.create({ data: { ip } });

  const role = await db.openRole.findFirst({
    where: { slug: roleSlug, clientOrg: { slug: companySlug } },
    include: { questions: true, clientOrg: true },
  });
  if (!role || !role.acceptingApplications) {
    return { error: "This role is no longer accepting applications." };
  }

  const parsed = baseSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    yearsExperience: formData.get("yearsExperience") || undefined,
    resumeLink: formData.get("resumeLink") || "",
    expectedPay: formData.get("expectedPay") || undefined,
    howHeard: formData.get("howHeard") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your answers." };
  }
  if (role.askYearsExperience && !parsed.data.yearsExperience) {
    return { error: "Years of experience is required." };
  }
  if (role.askExpectedPay && !parsed.data.expectedPay) {
    return { error: "Expected pay range is required." };
  }
  if (role.askHowHeard && !parsed.data.howHeard) {
    return { error: "Please tell us how you heard about this role." };
  }
  if (formData.get("followsSocial") !== "yes") {
    return { error: "Please confirm you follow us on social media before submitting." };
  }

  const answers: { roleQuestionId: string; value: string }[] = [];
  for (const q of role.questions) {
    let value: string;
    if (q.type === "CHECKBOXES") {
      const selected = formData.getAll(`answer_${q.id}`).filter((v): v is string => typeof v === "string");
      const invalid = selected.find((v) => !q.options.includes(v));
      if (invalid) {
        return { error: `"${q.label}" has an invalid answer.` };
      }
      value = selected.join(", ");
    } else {
      const raw = formData.get(`answer_${q.id}`);
      value = typeof raw === "string" ? raw.trim() : "";
      if (q.type === "MULTIPLE_CHOICE" && value && !q.options.includes(value)) {
        return { error: `"${q.label}" has an invalid answer.` };
      }
    }
    if (q.required && !value) {
      return { error: `"${q.label}" is required.` };
    }
    if (value) answers.push({ roleQuestionId: q.id, value });
  }

  const candidate = await db.candidate.create({
    data: {
      openRoleId: role.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      yearsExperience: parsed.data.yearsExperience,
      resumeLink: parsed.data.resumeLink || undefined,
      expectedPay: parsed.data.expectedPay,
      howHeard: parsed.data.howHeard,
      source: "WEBSITE",
      stage: "APPLIED",
      answers: { create: answers },
    },
  });

  const origin = await getOrigin();
  const detailLines = [
    `Email: ${parsed.data.email}`,
    `Phone: ${parsed.data.phone}`,
    parsed.data.yearsExperience && `Experience: ${parsed.data.yearsExperience}`,
    parsed.data.expectedPay && `Expected pay: ${parsed.data.expectedPay}`,
    parsed.data.howHeard && `Heard about it via: ${parsed.data.howHeard}`,
  ].filter(Boolean);
  await sendOpsNotification(
    `New application: ${role.title} at ${role.clientOrg.name}`,
    `${parsed.data.name} applied for ${role.title} (${role.clientOrg.name}).\n\n` +
      `${detailLines.join("\n")}\n\n` +
      `View: ${origin}/ops/recruitment/${role.id}#candidate-${candidate.id}`,
  );

  return { success: true, name: parsed.data.name };
}
