"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getOrigin } from "@/lib/url";
import { sendOpsNotification, sendNotification } from "@/lib/email";

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
    const summary =
      `${employee.name} (${employee.clientOrg.name}) requested ${parsed.data.type.toLowerCase()} leave ` +
      `from ${parsed.data.startDate} to ${parsed.data.endDate}.` +
      `${parsed.data.reason ? `\nReason: ${parsed.data.reason}` : ""}`;

    await sendOpsNotification(`Leave request: ${employee.name}`, `${summary}\n\nView: ${origin}/ops/leave`);

    const clientUsers = await db.user.findMany({
      where: { clientOrgId: employee.clientOrgId, role: "CLIENT" },
      select: { email: true },
    });
    if (clientUsers.length > 0) {
      await sendNotification(
        clientUsers.map((u) => u.email),
        `Leave request awaiting your approval: ${employee.name}`,
        `${summary}\n\nApprove or decline: ${origin}/client/leave`,
      );
    }
  }

  revalidatePath("/me/leave");
  redirect(`/me/leave?done=${encodeURIComponent("Leave request submitted")}`);
}
