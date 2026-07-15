"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { todayDateOnly } from "@/lib/attendance";

export async function clockIn() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account");

  const date = todayDateOnly();
  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });
  if (existing) return;

  await db.attendanceRecord.create({
    data: { employeeId, date, clockIn: new Date() },
  });

  revalidatePath("/me/attendance");
}

export async function clockOut() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account");

  const date = todayDateOnly();
  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });
  if (!existing || existing.clockOut) return;

  await db.attendanceRecord.update({
    where: { id: existing.id },
    data: { clockOut: new Date() },
  });

  revalidatePath("/me/attendance");
}
