import { put } from "@vercel/blob";

export const MAX_LOGO_FILE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_LOGO_FILE_LABEL = "5MB";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);

export async function uploadClientLogo(file: File): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Please upload a JPG, PNG, WEBP, or SVG image." };
  }
  if (file.size > MAX_LOGO_FILE_BYTES) {
    return { error: `That logo is too large. Please keep it under ${MAX_LOGO_FILE_LABEL}.` };
  }

  try {
    const blob = await put(`client-logos/${Date.now()}-${file.name}`, file, { access: "public" });
    return { url: blob.url };
  } catch (err) {
    console.error("[logo] failed to upload:", err);
    return { error: "We couldn't upload that logo right now. Please try again in a moment." };
  }
}
