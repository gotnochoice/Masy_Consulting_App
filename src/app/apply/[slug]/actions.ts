"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { sendOpsNotification } from "@/lib/email";

export type ApplyState = { error?: string; success?: boolean };

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(1, "Phone is required"),
  yearsExperience: z.string().min(1, "Years of experience is required"),
  resumeLink: z.string().url("Enter a full link, starting with https://").optional().or(z.literal("")),
});

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function submitApplication(slug: string, _prevState: ApplyState, formData: FormData): Promise<ApplyState> {
  // Honeypot: bots tend to fill every field, real applicants never see this one.
  if (formData.get("company_website")) {
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

  const role = await db.openRole.findUnique({
    where: { slug },
    include: { questions: true, clientOrg: true },
  });
  if (!role || !role.acceptingApplications) {
    return { error: "This role is no longer accepting applications." };
  }

  const parsed = baseSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    yearsExperience: formData.get("yearsExperience"),
    resumeLink: formData.get("resumeLink") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your answers." };
  }

  const answers: { roleQuestionId: string; value: string }[] = [];
  for (const q of role.questions) {
    const raw = formData.get(`answer_${q.id}`);
    const value = typeof raw === "string" ? raw.trim() : "";
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
      source: "WEBSITE",
      stage: "APPLIED",
      answers: { create: answers },
    },
  });

  const origin = await getOrigin();
  await sendOpsNotification(
    `New application: ${role.title} at ${role.clientOrg.name}`,
    `${parsed.data.name} applied for ${role.title} (${role.clientOrg.name}).\n\n` +
      `Email: ${parsed.data.email}\nPhone: ${parsed.data.phone}\nExperience: ${parsed.data.yearsExperience}\n\n` +
      `View: ${origin}/ops/recruitment/${role.id}#candidate-${candidate.id}`,
  );

  return { success: true };
}
