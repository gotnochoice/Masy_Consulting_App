"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getOrigin } from "@/lib/url";
import { sendOpsNotification } from "@/lib/email";

const schema = z.object({
  type: z.enum(["ANNUAL", "SICK", "OTHER"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().optional(),
});

export async function requestLeave(formData: FormData) {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account");

  const parsed = schema.safeParse({
    type: formData.get("type"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid leave request");
  }

  if (new Date(parsed.data.endDate) < new Date(parsed.data.startDate)) {
    throw new Error("End date must be on or after start date");
  }

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { clientOrg: true },
  });

  await db.leaveRequest.create({
    data: {
      employeeId,
      type: parsed.data.type,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      reason: parsed.data.reason,
    },
  });

  if (employee) {
    const origin = await getOrigin();
    await sendOpsNotification(
      `Leave request: ${employee.name}`,
      `${employee.name} (${employee.clientOrg.name}) requested ${parsed.data.type.toLowerCase()} leave ` +
        `from ${parsed.data.startDate} to ${parsed.data.endDate}.` +
        `${parsed.data.reason ? `\nReason: ${parsed.data.reason}` : ""}\n\nView: ${origin}/ops/leave`,
    );
  }

  revalidatePath("/me/leave");
}
