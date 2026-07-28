"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getOrigin } from "@/lib/url";
import { sendOpsNotification } from "@/lib/email";

const schema = z.object({
  type: z.enum(["EMPLOYMENT_VERIFICATION", "REFERENCE", "SALARY_CONFIRMATION", "OTHER"]),
  details: z.string().optional(),
});

export async function requestDocument(formData: FormData) {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account");

  const parsed = schema.safeParse({
    type: formData.get("type"),
    details: formData.get("details") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid document request");
  }

  const employee = await db.employee.findUnique({ where: { id: employeeId }, include: { clientOrg: true } });

  await db.documentRequest.create({
    data: {
      employeeId,
      type: parsed.data.type,
      details: parsed.data.details,
    },
  });

  if (employee) {
    const origin = await getOrigin();
    await sendOpsNotification(
      `Document request: ${employee.name}`,
      `${employee.name} (${employee.clientOrg.name}) requested a document: ${parsed.data.type}.` +
        `${parsed.data.details ? `\nDetails: ${parsed.data.details}` : ""}\n\nView: ${origin}/ops/documents`,
    );
  }

  revalidatePath("/me/documents");
  redirect(`/me/documents?done=${encodeURIComponent("Document request submitted")}`);
}
