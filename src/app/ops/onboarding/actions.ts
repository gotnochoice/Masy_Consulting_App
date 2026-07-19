"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export async function toggleOnboardingTask(taskId: string) {
  await requireRole("MASY_OPS");

  const task = await db.onboardingTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  await db.onboardingTask.update({ where: { id: taskId }, data: { done: !task.done } });

  revalidatePath("/ops/onboarding");
}
