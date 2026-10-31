"use client";

import { useState } from "react";

export function CopyValuesButton({ values, noun }: { values: string[]; noun: string }) {
  const [copied, setCopied] = useState(false);

  if (values.length === 0) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(values.join(", "));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-btn border border-border px-3 py-2 text-xs font-medium text-slate hover:text-ink"
    >
      {copied ? "Copied!" : `Copy ${values.length} ${noun}${values.length === 1 ? "" : "s"}`}
    </button>
  );
}
