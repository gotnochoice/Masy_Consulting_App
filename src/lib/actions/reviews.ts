"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { scopedEmployeeWhere } from "@/lib/rbac";

export async function acknowledgeReview(reviewId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") {
    redirect("/login");
  }

  const review = await db.performanceReview.findFirst({
    where: { id: reviewId, employee: scopedEmployeeWhere(session) },
  });
  if (!review) throw new Error("Not authorized for this review");

  await db.performanceReviewAck.upsert({
    where: { performanceReviewId_userId: { performanceReviewId: reviewId, userId: session.user.id } },
    create: { performanceReviewId: reviewId, userId: session.user.id },
    update: {},
  });

  revalidatePath("/client/reviews");
}
