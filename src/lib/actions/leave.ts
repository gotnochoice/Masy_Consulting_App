"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { leaveDaysBetween } from "@/lib/leave";

export async function decideLeaveRequest(requestId: string, decision: "APPROVED" | "DENIED") {
  const session = await auth();
  if (!session?.user || (session.user.role !== "MASY_OPS" && session.user.role !== "CLIENT")) {
    redirect("/login");
  }

  const leave = await db.leaveRequest.findUnique({
    where: { id: requestId },
    include: { employee: true },
  });
  if (!leave) throw new Error("Leave request not found");

  if (session.user.role === "CLIENT" && leave.employee.clientOrgId !== session.user.clientOrgId) {
    throw new Error("Not authorized for this request");
  }

  if (leave.status !== "PENDING") return;

  const days = leaveDaysBetween(leave.startDate, leave.endDate);

  await db.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: requestId },
      data: { status: decision, approverId: session.user.id, decidedAt: new Date() },
    });
    if (decision === "APPROVED") {
      await tx.employee.update({
        where: { id: leave.employeeId },
        data: { leaveBalanceDays: { decrement: days } },
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: decision === "APPROVED" ? "leave.approve" : "leave.deny",
        targetType: "LeaveRequest",
        targetId: requestId,
      },
    });
  });
}
