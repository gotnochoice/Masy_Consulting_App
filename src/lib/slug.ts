import { randomBytes } from "crypto";

export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = randomBytes(3).toString("hex");
  return `${base || "role"}-${suffix}`;
}
