"use client";

import { Printer } from "lucide-react";

export function PrintButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className ?? "inline-flex items-center gap-1.5 text-xs font-medium text-slate hover:text-ink print:hidden"}
    >
      <Printer className="h-3.5 w-3.5" strokeWidth={2} />
      Print report
    </button>
  );
}
