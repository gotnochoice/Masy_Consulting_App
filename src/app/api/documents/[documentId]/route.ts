import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { HR_ONLY_DOCUMENT_CATEGORIES } from "@/lib/employee-documents";

// Every file view goes through here instead of a raw blob URL: checks the viewer is actually
// allowed to see this specific document, fetches it server-side, and logs the access --
// "who opened what, when" -- rather than handing out a link anyone holding it could reuse.
export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { documentId } = await params;
  const document = await db.employeeDocument.findUnique({ where: { id: documentId }, include: { employee: true } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOps = session.user.role === "MASY_OPS";
  const isOwnEmployee = session.user.role === "EMPLOYEE" && session.user.employeeId === document.employeeId;
  // A client can view their own employee's non-HR-only documents -- re-checked here, not
  // just relied on from the list query, since this route is reachable by document ID directly.
  const isOwnOrgClient =
    session.user.role === "CLIENT" &&
    session.user.clientOrgId === document.employee.clientOrgId &&
    !HR_ONLY_DOCUMENT_CATEGORIES.includes(document.category);
  if (!isOps && !isOwnEmployee && !isOwnOrgClient) {
    return NextResponse.json({ error: "Not authorized to view this document" }, { status: 403 });
  }

  // Logged as soon as authorization passes -- the audit trail is "who was let in to view this",
  // which holds regardless of whether the storage fetch below happens to succeed.
  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee_document.view",
      targetType: "EmployeeDocument",
      targetId: document.id,
    },
  });

  const upstream = await fetch(document.fileUrl);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Couldn't load that file right now" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `inline; filename="${document.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
