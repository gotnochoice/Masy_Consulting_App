"use client";

import { useState } from "react";

export function CopyEmailsButton({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false);

  if (emails.length === 0) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(emails.join(", "));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-btn border border-border px-3 py-2 text-xs font-medium text-slate hover:text-ink"
    >
      {copied ? "Copied!" : `Copy ${emails.length} email${emails.length === 1 ? "" : "s"}`}
    </button>
  );
}
