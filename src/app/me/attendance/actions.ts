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

  const note = formData.get("note");
  const trimmedNote = typeof note === "string" ? note.trim() : "";
  if (!trimmedNote) throw new Error("Add a short note on what you're working on");

  const date = todayDateOnly();
  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date } },
    include: { sessions: { orderBy: { clockIn: "desc" }, take: 1 } },
  });
  const openSession = existing?.sessions[0] && !existing.sessions[0].clockOut ? existing.sessions[0] : null;
  if (openSession) return;

  const now = new Date();

  if (!existing) {
    await db.attendanceRecord.create({
      data: {
        employeeId,
        date,
        clockIn: now,
        clockInNote: trimmedNote,
        sessions: { create: { clockIn: now, clockInNote: trimmedNote } },
      },
    });
  } else {
    // Clocking back in after stepping away earlier today -- starts a new session. The day's
    // summary row goes back to "currently clocked in" (clockOut cleared) without touching the
    // earlier session already recorded.
    await db.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        clockOut: null,
        clockOutNote: null,
        sessions: { create: { clockIn: now, clockInNote: trimmedNote } },
      },
    });
  }

  revalidatePath("/me/attendance");
  redirect(`/me/attendance?done=${encodeURIComponent("Clocked in")}`);
}

export async function clockOut(formData: FormData) {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account");

  const note = formData.get("note");
  const trimmedNote = typeof note === "string" ? note.trim() : "";
  if (!trimmedNote) throw new Error("Add a short reason for clocking out");

  const date = todayDateOnly();
  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date } },
    include: { sessions: { orderBy: { clockIn: "desc" }, take: 1 } },
  });
  const openSession = existing?.sessions[0] && !existing.sessions[0].clockOut ? existing.sessions[0] : null;
  if (!existing || !openSession) return;

  const now = new Date();

  await db.$transaction([
    db.attendanceSession.update({
      where: { id: openSession.id },
      data: { clockOut: now, clockOutNote: trimmedNote },
    }),
    db.attendanceRecord.update({
      where: { id: existing.id },
      data: { clockOut: now, clockOutNote: trimmedNote },
    }),
  ]);

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
