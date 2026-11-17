"use client";

import { inputClass, buttonClass } from "@/lib/form-styles";
import { countersignDocuments } from "./actions";

export function CountersignForm({ employeeId }: { employeeId: string }) {
  const action = countersignDocuments.bind(null, employeeId);

  return (
    <form action={action} className="flex items-center gap-2">
      <input name="typedName" placeholder="Type your name to countersign" required className={`${inputClass} w-auto`} />
      <button type="submit" className={`${buttonClass} py-1.5 text-xs`}>Countersign</button>
    </form>
  );
}
