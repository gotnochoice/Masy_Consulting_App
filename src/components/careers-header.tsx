export function CareersHeader({ maxWidthClass = "max-w-2xl" }: { maxWidthClass?: string }) {
  return (
    <div className="border-b border-ink/10 bg-ink px-6 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
      <div className={`mx-auto flex ${maxWidthClass} items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/masy-mark.png" alt="" className="h-6 w-6" />
          </span>
          <span className="text-lg font-extrabold text-white">Masy Consulting</span>
        </div>
        <span className="hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/60 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-orange" />
          Careers
        </span>
      </div>
    </div>
  );
}
