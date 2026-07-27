"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { todayDateOnly } from "@/lib/attendance";

export async function clockIn(formData: FormData) {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account");

  const date = todayDateOnly();
  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });
  if (existing) return;

  const note = formData.get("note");
  await db.attendanceRecord.create({
    data: {
      employeeId,
      date,
      clockIn: new Date(),
      clockInNote: typeof note === "string" && note.trim() ? note.trim() : null,
    },
  });

  revalidatePath("/me/attendance");
  redirect(`/me/attendance?done=${encodeURIComponent("Clocked in")}`);
}

export async function clockOut(formData: FormData) {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account");

  const date = todayDateOnly();
  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });
  if (!existing || existing.clockOut) return;

  const note = formData.get("note");
  await db.attendanceRecord.update({
    where: { id: existing.id },
    data: {
      clockOut: new Date(),
      clockOutNote: typeof note === "string" && note.trim() ? note.trim() : null,
    },
  });

  revalidatePath("/me/attendance");
  redirect(`/me/attendance?done=${encodeURIComponent("Clocked out")}`);
}

export async function deleteAttendanceRecord(recordId: string) {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account");

  await db.attendanceRecord.deleteMany({ where: { id: recordId, employeeId } });

  revalidatePath("/me/attendance");
}
