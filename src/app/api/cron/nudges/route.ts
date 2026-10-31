import { NextResponse } from "next/server";
import { buildNudgesDigest } from "@/lib/nudges";
import { sendOpsNotification } from "@/lib/email";

// Vercel Cron calls this on a schedule (see vercel.json) with an Authorization header set to
// the CRON_SECRET env var. Guarding it like this stops anyone else from triggering it (or
// finding out who's missing a clock-in) just by requesting the URL.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const digest = await buildNudgesDigest();
  if (!digest) {
    return NextResponse.json({ ok: true, sent: false, reason: "Nothing to nudge about today" });
  }

  await sendOpsNotification(digest.subject, digest.body);
  return NextResponse.json({ ok: true, sent: true });
}
