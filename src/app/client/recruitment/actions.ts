"use server";

import { revalidatePath } from "next/cache";
import { updateCandidateStageShared } from "@/lib/actions/recruitment";

export async function updateCandidateStage(candidateId: string, formData: FormData) {
  await updateCandidateStageShared(candidateId, formData.get("stage"));
  revalidatePath("/client/recruitment");
}
