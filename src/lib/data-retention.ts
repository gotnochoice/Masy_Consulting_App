import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import type { EmployeeDocument } from "@/generated/prisma/client";
import { HR_ONLY_DOCUMENT_CATEGORIES } from "@/lib/employee-documents";

const RETENTION_DAYS = 365; // 1 year after exit, confirmed with Enny

async function deleteDocuments(documents: EmployeeDocument[], actorId: string, action: string): Promise<number> {
  for (const document of documents) {
    try {
      await del(document.fileUrl);
    } catch (err) {
      // Blob storage not configured, or already gone -- delete the database row either way
      // so retention doesn't get stuck on a dangling file.
      console.error("[data-retention] failed to delete blob, removing record anyway:", err);
    }
    await db.employeeDocument.delete({ where: { id: document.id } });
    await db.auditLog.create({
      data: { actorId, action, targetType: "EmployeeDocument", targetId: document.id },
    });
  }
  return documents.length;
}

// Deletes identity-verification documents (ID, NIN slip, proof of address) for employees who
// exited at least a year ago -- the one data-retention rule the spec called for explicitly.
// Run by /api/cron/data-retention on a daily schedule; safe to call more than once a day since
// there's nothing left to delete the second time around.
export async function deleteExpiredIdentityDocuments(): Promise<{ employeesProcessed: number; documentsDeleted: number }> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const employees = await db.employee.findMany({
    where: { status: "OFFBOARDED", offboardedAt: { lte: cutoff } },
    select: {
      id: true,
      documents: { where: { category: { in: HR_ONLY_DOCUMENT_CATEGORIES } } },
    },
  });

  let documentsDeleted = 0;
  for (const employee of employees) {
    documentsDeleted += await deleteDocuments(employee.documents, "system:data-retention", "employee_document.retention_delete");
  }

  return { employeesProcessed: employees.length, documentsDeleted };
}

// Deletion-on-request: HR can delete one employee's identity documents immediately, ahead of
// the normal 1-year-after-exit schedule, e.g. when the employee (or former employee) explicitly
// asks for their identity documents to be deleted.
export async function deleteIdentityDocumentsNow(employeeId: string, actorId: string): Promise<number> {
  const documents = await db.employeeDocument.findMany({
    where: { employeeId, category: { in: HR_ONLY_DOCUMENT_CATEGORIES } },
  });
  return deleteDocuments(documents, actorId, "employee_document.requested_delete");
}
