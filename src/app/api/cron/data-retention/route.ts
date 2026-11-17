import { NextResponse } from "next/server";
import { deleteExpiredIdentityDocuments } from "@/lib/data-retention";

// Vercel Cron calls this on a schedule (see vercel.json) with an Authorization header set to
// the CRON_SECRET env var -- same guard as /api/cron/nudges.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await deleteExpiredIdentityDocuments();
  return NextResponse.json({ ok: true, ...result });
}
