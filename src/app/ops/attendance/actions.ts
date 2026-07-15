"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const createSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  clockIn: z.string().min(1, "Clock-in time is required"),
  clockOut: z.string().optional(),
});

const updateSchema = z.object({
  date: z.string().min(1, "Date is required"),
  clockIn: z.string().min(1, "Clock-in time is required"),
  clockOut: z.string().optional(),
});

export async function createAttendanceRecord(formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = createSchema.safeParse({
    employeeId: formData.get("employeeId"),
    date: formData.get("date"),
    clockIn: formData.get("clockIn"),
    clockOut: formData.get("clockOut") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid attendance data");
  }

  const { employeeId, date, clockIn, clockOut } = parsed.data;

  const record = await db.attendanceRecord.create({
    data: {
      employeeId,
      date: new Date(date),
      clockIn: new Date(`${date}T${clockIn}`),
      clockOut: clockOut ? new Date(`${date}T${clockOut}`) : null,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "attendance.create",
      targetType: "AttendanceRecord",
      targetId: record.id,
    },
  });

  revalidatePath("/ops/attendance");
}

export async function updateAttendanceRecord(recordId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = updateSchema.safeParse({
    date: formData.get("date"),
    clockIn: formData.get("clockIn"),
    clockOut: formData.get("clockOut") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid attendance data");
  }

  const { date, clockIn, clockOut } = parsed.data;

  await db.attendanceRecord.update({
    where: { id: recordId },
    data: {
      date: new Date(date),
      clockIn: new Date(`${date}T${clockIn}`),
      clockOut: clockOut ? new Date(`${date}T${clockOut}`) : null,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "attendance.correct",
      targetType: "AttendanceRecord",
      targetId: recordId,
    },
  });

  revalidatePath("/ops/attendance");
  redirect("/ops/attendance");
}
