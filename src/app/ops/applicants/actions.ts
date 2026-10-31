"use server";

import { redirect } from "next/navigation";
import { deleteCandidate } from "../recruitment/actions";

export async function deleteCandidateAndRedirect(candidateId: string, roleId: string) {
  await deleteCandidate(candidateId, roleId);
  redirect("/ops/applicants");
}
