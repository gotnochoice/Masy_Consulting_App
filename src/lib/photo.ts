import { put } from "@vercel/blob";

export const MAX_PHOTO_FILE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_PHOTO_FILE_LABEL = "5MB";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadEmployeePhoto(file: File): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Please upload a JPG, PNG, or WEBP image." };
  }
  if (file.size > MAX_PHOTO_FILE_BYTES) {
    return { error: `That photo is too large. Please keep it under ${MAX_PHOTO_FILE_LABEL}.` };
  }

  try {
    const blob = await put(`employee-photos/${Date.now()}-${file.name}`, file, { access: "public" });
    return { url: blob.url };
  } catch (err) {
    console.error("[photo] failed to upload:", err);
    return { error: "We couldn't upload that photo right now. Please try again in a moment." };
  }
}
