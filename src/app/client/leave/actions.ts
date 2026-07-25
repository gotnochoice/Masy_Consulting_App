"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { decideLeaveRequest } from "@/lib/actions/leave";

export async function approveLeave(requestId: string, formData: FormData) {
  await decideLeaveRequest(requestId, "APPROVED");
  revalidatePath("/client/leave");
  revalidatePath("/client/staff");
  const redirectTo = (formData.get("redirectTo") as string) || "/client/leave";
  redirect(`${redirectTo}?done=${encodeURIComponent("Leave request approved")}`);
}

export async function denyLeave(requestId: string, formData: FormData) {
  await decideLeaveRequest(requestId, "DENIED");
  revalidatePath("/client/leave");
  revalidatePath("/client/staff");
  const redirectTo = (formData.get("redirectTo") as string) || "/client/leave";
  redirect(`${redirectTo}?done=${encodeURIComponent("Leave request declined")}`);
}
