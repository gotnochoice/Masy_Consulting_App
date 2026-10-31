"use client";

import { useState } from "react";

export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-btn border border-border px-3 py-2 text-xs font-medium text-slate hover:text-ink"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
