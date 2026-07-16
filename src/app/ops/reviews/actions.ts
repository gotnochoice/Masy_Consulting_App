"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const notesSchema = z.object({
  masyNotes: z.string().min(1, "Write your notes before saving"),
});

export async function saveReviewNotes(reviewId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = notesSchema.safeParse({ masyNotes: formData.get("masyNotes") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid review notes");
  }

  const review = await db.performanceReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Review not found");

  await db.performanceReview.update({
    where: { id: reviewId },
    data: {
      masyNotes: parsed.data.masyNotes,
      status: review.status === "SUBMITTED" ? "MASY_REVIEWED" : review.status,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "review.annotate",
      targetType: "PerformanceReview",
      targetId: reviewId,
    },
  });

  revalidatePath("/ops/reviews");
}

export async function releaseReview(reviewId: string) {
  const session = await requireRole("MASY_OPS");

  const review = await db.performanceReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Review not found");
  if (!review.masyNotes) {
    throw new Error("Add Masy's notes before releasing this to the client");
  }

  await db.performanceReview.update({
    where: { id: reviewId },
    data: { status: "RELEASED" },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "review.release_to_client",
      targetType: "PerformanceReview",
      targetId: reviewId,
    },
  });

  revalidatePath("/ops/reviews");
}
