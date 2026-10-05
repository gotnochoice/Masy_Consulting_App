"use server";

import { z } from "zod";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { sendOpsNotification } from "@/lib/email";
import { checkApplicationRateLimit } from "@/lib/application-rate-limit";

const MAX_PHOTO_FILE_BYTES = 8 * 1024 * 1024; // 8MB, phone camera photos can be large
const MAX_PHOTO_FILE_LABEL = "8MB";
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export type InformalApplyState = { error?: string; success?: boolean; name?: string };

const schema = z.object({
  name: z.string().min(1, "Please enter your name"),
  phone: z.string().min(1, "Please enter your phone number"),
  email: z.string().email("That email doesn't look right").optional().or(z.literal("")),
  location: z.string().optional(),
});

export async function submitInformalApplication(
  companySlug: string,
  roleSlug: string,
  _prevState: InformalApplyState,
  formData: FormData,
): Promise<InformalApplyState> {
  // Honeypot: bots tend to fill every field, real applicants never see this one.
  if (formData.get("hp_gate")) {
    return { success: true };
  }

  const role = await db.openRole.findFirst({
    where: { slug: roleSlug, clientOrg: { slug: companySlug }, mode: "INFORMAL" },
    include: { clientOrg: true },
  });
  if (!role || !role.acceptingApplications) {
    return { error: "This role is no longer accepting applications." };
  }

  const { allowed } = await checkApplicationRateLimit(role.id);
  if (!allowed) {
    return { error: "Too many applications submitted recently. Please try again in a little while." };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check what you entered." };
  }

  const photoRaw = formData.get("workSamplePhoto");
  if (!(photoRaw instanceof File) || photoRaw.size === 0) {
    return { error: "Please add a photo of your work before sending." };
  }
  if (!ALLOWED_PHOTO_TYPES.has(photoRaw.type)) {
    return { error: "Please use a photo (JPG, PNG, or WEBP)." };
  }
  if (photoRaw.size > MAX_PHOTO_FILE_BYTES) {
    return { error: `That photo is too large. Please keep it under ${MAX_PHOTO_FILE_LABEL}.` };
  }

  let workSampleUrl: string;
  try {
    const blob = await put(`work-samples/${role.id}/${Date.now()}-${photoRaw.name}`, photoRaw, { access: "public" });
    workSampleUrl = blob.url;
  } catch (err) {
    console.error("[informal apply] failed to upload photo:", err);
    return { error: "We couldn't upload your photo right now. Please try again in a moment." };
  }

  const candidate = await db.candidate.create({
    data: {
      openRoleId: role.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone,
      location: parsed.data.location || null,
      workSampleUrl,
      source: "WEBSITE",
      stage: "APPLIED",
    },
  });

  const origin = await getOrigin();
  await sendOpsNotification(
    `New application: ${role.title} at ${role.clientOrg.name}`,
    `${parsed.data.name} applied for ${role.title} (${role.clientOrg.name}).\n\n` +
      `Phone: ${parsed.data.phone}\n` +
      `${parsed.data.email ? `Email: ${parsed.data.email}\n` : ""}` +
      `${parsed.data.location ? `Location: ${parsed.data.location}\n` : ""}` +
      `\nView: ${origin}/ops/recruitment/${role.id}#candidate-${candidate.id}`,
  );

  return { success: true, name: parsed.data.name };
}
