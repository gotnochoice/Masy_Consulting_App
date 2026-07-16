"use server";

import { revalidatePath } from "next/cache";
import { decideLeaveRequest } from "@/lib/actions/leave";

export async function approveLeave(requestId: string) {
  await decideLeaveRequest(requestId, "APPROVED");
  revalidatePath("/client/leave");
}

export async function denyLeave(requestId: string) {
  await decideLeaveRequest(requestId, "DENIED");
  revalidatePath("/client/leave");
}
