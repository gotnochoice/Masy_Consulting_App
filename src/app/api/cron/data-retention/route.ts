import { NextResponse } from "next/server";
import { deleteExpiredIdentityDocuments } from "@/lib/data-retention";
import { sendCommencementReminders } from "@/lib/onboarding-notify";

// Vercel Cron calls this on a schedule (see vercel.json) with an Authorization header set to
// the CRON_SECRET env var -- same guard as /api/cron/nudges. Commencement reminders ride along
// here (rather than as a third cron entry) because this one already runs every day, including
// weekends -- unlike /api/cron/nudges, which only runs on weekdays.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const retention = await deleteExpiredIdentityDocuments();
  const remindersSent = await sendCommencementReminders();
  return NextResponse.json({ ok: true, ...retention, remindersSent });
}
