import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Same pattern as /api/documents/[documentId]: never hand out the raw blob URL, check the
// viewer is actually allowed to see this record, log the access, then stream it. The client
// Founder is deliberately not one of the allowed viewers here -- this record carries NIN/bank
// details and guarantor info that the addendum keeps out of their view, unlike the agreement
// and property-handover records.
export async function GET(_request: Request, { params }: { params: Promise<{ recordId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { recordId } = await params;
  const record = await db.onboardingRecord.findUnique({ where: { id: recordId } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOps = session.user.role === "MASY_OPS";
  const isOwnEmployee = session.user.role === "EMPLOYEE" && session.user.employeeId === record.employeeId;
  if (!isOps && !isOwnEmployee) {
    return NextResponse.json({ error: "Not authorized to view this record" }, { status: 403 });
  }

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "onboarding_record.view",
      targetType: "OnboardingRecord",
      targetId: record.id,
    },
  });

  if (!record.fileUrl) {
    return NextResponse.json({ error: "This record's file couldn't be generated. Ask HR to retry it." }, { status: 503 });
  }

  const upstream = await fetch(record.fileUrl);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Couldn't load that record right now" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${record.recordNumber}-v${record.version}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
