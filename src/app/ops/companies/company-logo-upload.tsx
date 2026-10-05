"use client";

import { useRef } from "react";
import { ClientLogo } from "@/components/client-logo";

export function CompanyLogoUpload({
  name,
  logoUrl,
  action,
}: {
  name: string;
  logoUrl?: string | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex items-center gap-2">
      <ClientLogo name={name} logoUrl={logoUrl} />
      <form ref={formRef} action={action}>
        <label className="cursor-pointer text-[11px] font-medium text-indigo hover:text-indigo-light">
          {logoUrl ? "Change" : "Upload"}
          <input
            type="file"
            name="logo"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={() => formRef.current?.requestSubmit()}
          />
        </label>
      </form>
    </div>
  );
}
