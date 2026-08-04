import { db } from "@/lib/db";

export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "role";
}

export async function uniqueRoleSlug(title: string) {
  const base = slugify(title);
  const existing = await db.openRole.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  if (existing.length === 0) return base;

  const taken = new Set(existing.map((r) => r.slug));
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
