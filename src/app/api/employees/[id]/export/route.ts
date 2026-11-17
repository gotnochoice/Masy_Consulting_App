import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { decryptSensitive } from "@/lib/encryption";

// A subject-access-request export: everything this app holds on one employee, as a downloadable
// JSON file. Ops-only -- the one role that's allowed to see all of it, identity documents and NIN
// included -- and every export is itself logged.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.user.role !== "MASY_OPS") return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await params;
  const employee = await db.employee.findUnique({
    where: { id },
    include: {
      clientOrg: { select: { name: true } },
      documents: { select: { label: true, category: true, idDocumentType: true, documentDate: true, fileName: true, createdAt: true } },
      guarantors: { select: { name: true, relationship: true, phone: true, email: true, address: true, verificationLogs: true } },
      documentAcknowledgments: true,
      keyTermAcknowledgments: true,
      comprehensionAttempts: true,
      eSignatures: { select: { documentType: true, signedAt: true, countersignedAt: true, ipAddress: true, documentHash: true } },
      companyAssets: true,
      attendanceRecords: { select: { date: true, clockIn: true, clockOut: true } },
      leaveRequests: { select: { type: true, startDate: true, endDate: true, status: true } },
      performanceReviews: { select: { cycle: true, status: true, createdAt: true } },
    },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { nin, ...rest } = employee;
  const exportData = { ...rest, nin: nin ? decryptSensitive(nin) : null, exportedAt: new Date().toISOString() };

  await db.auditLog.create({
    data: { actorId: session.user.id, action: "employee.data_export", targetType: "Employee", targetId: employee.id },
  });

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${employee.name.replace(/[^a-z0-9]+/gi, "-")}-data-export.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
