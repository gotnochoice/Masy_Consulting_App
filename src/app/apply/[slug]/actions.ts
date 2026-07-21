"use server";

import { z } from "zod";
import { db } from "@/lib/db";

export type ApplyState = { error?: string; success?: boolean };

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  resumeLink: z.string().url("Enter a full link, starting with https://").optional().or(z.literal("")),
});

export async function submitApplication(slug: string, _prevState: ApplyState, formData: FormData): Promise<ApplyState> {
  // Honeypot: bots tend to fill every field, real applicants never see this one.
  if (formData.get("company_website")) {
    return { success: true };
  }

  const role = await db.openRole.findUnique({
    where: { slug },
    include: { questions: true },
  });
  if (!role || !role.acceptingApplications) {
    return { error: "This role is no longer accepting applications." };
  }

  const parsed = baseSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
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

  await db.candidate.create({
    data: {
      openRoleId: role.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      resumeLink: parsed.data.resumeLink || undefined,
      source: "WEBSITE",
      stage: "APPLIED",
      answers: { create: answers },
    },
  });

  return { success: true };
}
