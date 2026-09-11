"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const CANDIDATE_STAGES = ["APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "HIRED", "REJECTED"] as const;

export async function updateCandidateStageShared(candidateId: string, stage: unknown) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "MASY_OPS" && session.user.role !== "CLIENT")) {
    redirect("/login");
  }

  const parsedStage = z.enum(CANDIDATE_STAGES).safeParse(stage);
  if (!parsedStage.success) throw new Error("Invalid stage");

  const candidate = await db.candidate.findUnique({
    where: { id: candidateId },
    select: { openRole: { select: { clientOrgId: true } } },
  });
  if (!candidate) throw new Error("Candidate not found");

  if (session.user.role === "CLIENT" && candidate.openRole.clientOrgId !== session.user.clientOrgId) {
    throw new Error("Not authorized for this candidate");
  }

  await db.candidate.update({ where: { id: candidateId }, data: { stage: parsedStage.data } });
}
