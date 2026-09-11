import { headers } from "next/headers";
import { db } from "@/lib/db";

const RATE_LIMIT_MAX_ATTEMPTS = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function checkApplicationRateLimit(openRoleId: string): Promise<{ allowed: boolean; ip: string }> {
  const ip = await getClientIp();
  const recentAttempts = await db.applicationAttempt.count({
    where: { ip, openRoleId, createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } },
  });
  if (recentAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, ip };
  }
  await db.applicationAttempt.create({ data: { ip, openRoleId } });
  return { allowed: true, ip };
}
