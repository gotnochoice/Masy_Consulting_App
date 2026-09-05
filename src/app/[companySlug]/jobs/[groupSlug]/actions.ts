"use server";

import { z } from "zod";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { sendOpsNotification } from "@/lib/email";
import { MAX_RESUME_FILE_BYTES, MAX_RESUME_FILE_LABEL } from "@/lib/resume";
import { SOCIAL_PLATFORMS } from "@/components/social-links";
import { checkApplicationRateLimit } from "@/lib/application-rate-limit";

const MIN_FOLLOWED_SOCIALS = 2;
const VALID_SOCIAL_NAMES = new Set(SOCIAL_PLATFORMS.map((s) => s.name));

export type GroupApplyState = { error?: string; success?: boolean; name?: string; roleTitle?: string };

const baseSchema = z.object({
  roleId: z.string().min(1, "Please choose a role"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(1, "Phone is required"),
  yearsExperience: z.string().optional(),
  expectedPay: z.string().optional(),
  howHeard: z.string().optional(),
  location: z.string().optional(),
});

export async function submitGroupApplication(
  companySlug: string,
  groupSlug: string,
  _prevState: GroupApplyState,
  formData: FormData,
): Promise<GroupApplyState> {
  // Honeypot: bots tend to fill every field, real applicants never see this one.
  if (formData.get("hp_gate")) {
    return { success: true };
  }

  const group = await db.applicationGroup.findFirst({
    where: { slug: groupSlug, clientOrg: { slug: companySlug } },
    include: {
      clientOrg: true,
      questions: true,
      roles: { where: { acceptingApplications: true, mode: "FORMAL" }, include: { questions: true } },
    },
  });
  if (!group) {
    return { error: "This application link is no longer valid." };
  }

  const parsed = baseSchema.safeParse({
    roleId: formData.get("roleId"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    yearsExperience: formData.get("yearsExperience") || undefined,
    expectedPay: formData.get("expectedPay") || undefined,
    howHeard: formData.get("howHeard") || undefined,
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your answers." };
  }

  const role = group.roles.find((r) => r.id === parsed.data.roleId);
  if (!role) {
    return { error: "Please choose a role -- that one isn't accepting applications right now." };
  }

  const { allowed } = await checkApplicationRateLimit(role.id);
  if (!allowed) {
    return { error: "Too many applications submitted recently. Please try again in a little while." };
  }

  if (role.askYearsExperience && !parsed.data.yearsExperience) {
    return { error: "Years of experience is required." };
  }
  if (role.askExpectedPay && !parsed.data.expectedPay) {
    return { error: "Expected pay is required." };
  }
  if (role.askHowHeard && !parsed.data.howHeard) {
    return { error: "Please tell us how you heard about this role." };
  }
  if (role.askApplicantLocation && !parsed.data.location) {
    return { error: "Please tell us your location." };
  }
  const followedSocials = [...new Set(formData.getAll("followedSocials").filter((v): v is string => typeof v === "string"))];
  if (followedSocials.some((s) => !VALID_SOCIAL_NAMES.has(s))) {
    return { error: "Please check your answers." };
  }
  if (followedSocials.length < MIN_FOLLOWED_SOCIALS) {
    return { error: `Please select at least ${MIN_FOLLOWED_SOCIALS} platforms you follow us on before submitting.` };
  }

  let resumeFile: { name: string; url: string } | undefined;
  const resumeFileRaw = formData.get("resumeFile");
  if (resumeFileRaw instanceof File && resumeFileRaw.size > 0) {
    if (resumeFileRaw.type !== "application/pdf") {
      return { error: "Your CV must be a PDF file." };
    }
    if (resumeFileRaw.size > MAX_RESUME_FILE_BYTES) {
      return { error: `Your CV is too large. Please keep it under ${MAX_RESUME_FILE_LABEL}.` };
    }
    try {
      const blob = await put(`resumes/${role.id}/${resumeFileRaw.name}`, resumeFileRaw, {
        access: "public",
        contentType: "application/pdf",
      });
      resumeFile = { name: resumeFileRaw.name, url: blob.url };
    } catch (err) {
      console.error("[group apply] failed to upload resume:", err);
      return { error: "We couldn't upload your CV right now. Please try again in a moment." };
    }
  }

  const generalAnswers: { generalQuestionId: string; value: string }[] = [];
  for (const q of group.questions) {
    let value: string;
    if (q.type === "CHECKBOXES") {
      const selected = formData.getAll(`general_${q.id}`).filter((v): v is string => typeof v === "string");
      const invalid = selected.find((v) => !q.options.includes(v));
      if (invalid) return { error: `"${q.label}" has an invalid answer.` };
      value = selected.join(", ");
    } else {
      const raw = formData.get(`general_${q.id}`);
      value = typeof raw === "string" ? raw.trim() : "";
      if (q.type === "MULTIPLE_CHOICE" && value && !q.options.includes(value)) {
        return { error: `"${q.label}" has an invalid answer.` };
      }
    }
    if (q.required && !value) return { error: `"${q.label}" is required.` };
    if (value) generalAnswers.push({ generalQuestionId: q.id, value });
  }

  const answers: { roleQuestionId: string; value: string }[] = [];
  for (const q of role.questions) {
    let value: string;
    if (q.type === "CHECKBOXES") {
      const selected = formData.getAll(`answer_${q.id}`).filter((v): v is string => typeof v === "string");
      const invalid = selected.find((v) => !q.options.includes(v));
      if (invalid) return { error: `"${q.label}" has an invalid answer.` };
      value = selected.join(", ");
    } else {
      const raw = formData.get(`answer_${q.id}`);
      value = typeof raw === "string" ? raw.trim() : "";
      if (q.type === "MULTIPLE_CHOICE" && value && !q.options.includes(value)) {
        return { error: `"${q.label}" has an invalid answer.` };
      }
    }
    if (q.required && !value) return { error: `"${q.label}" is required.` };
    if (value) answers.push({ roleQuestionId: q.id, value });
  }

  const candidate = await db.candidate.create({
    data: {
      openRoleId: role.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      yearsExperience: parsed.data.yearsExperience,
      location: parsed.data.location,
      resumeFileName: resumeFile?.name,
      resumeFileUrl: resumeFile?.url,
      expectedPay: parsed.data.expectedPay,
      howHeard: parsed.data.howHeard,
      followedSocials,
      source: "WEBSITE",
      stage: "APPLIED",
      answers: { create: answers },
      generalAnswers: { create: generalAnswers },
    },
  });

  const origin = await getOrigin();
  const detailLines = [
    `Email: ${parsed.data.email}`,
    `Phone: ${parsed.data.phone}`,
    parsed.data.yearsExperience && `Experience: ${parsed.data.yearsExperience}`,
    parsed.data.location && `Location: ${parsed.data.location}`,
    parsed.data.expectedPay && `Expected pay: ${parsed.data.expectedPay}`,
    parsed.data.howHeard && `Heard about it via: ${parsed.data.howHeard}`,
  ].filter(Boolean);
  await sendOpsNotification(
    `New application: ${role.title} at ${group.clientOrg.name}`,
    `${parsed.data.name} applied for ${role.title} (${group.clientOrg.name}) via the "${group.title}" application link.\n\n` +
      `${detailLines.join("\n")}\n\n` +
      `View: ${origin}/ops/recruitment/${role.id}#candidate-${candidate.id}`,
  );

  return { success: true, name: parsed.data.name, roleTitle: role.title };
}
