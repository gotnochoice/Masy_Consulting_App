"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

function SuccessBannerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [message, setMessage] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    const done = searchParams.get("done");
    if (done && !handled.current) {
      handled.current = true;
      setMessage(done);
      router.replace(pathname, { scroll: false });
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, pathname, router]);

  if (!message) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-btn border border-indigo/20 bg-indigo-tint px-4 py-3 text-sm text-indigo">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={() => setMessage(null)}
        aria-label="Dismiss"
        className="shrink-0 text-indigo/60 hover:text-indigo"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

export function SuccessBanner() {
  return (
    <Suspense fallback={null}>
      <SuccessBannerInner />
    </Suspense>
  );
}
