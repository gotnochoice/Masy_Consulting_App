export function MasyLogo({ className = "text-lg", light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-extrabold ${light ? "text-white" : "text-indigo"} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/masy-mark.png" alt="" className="h-[1.15em] w-auto" />
      Masy Consulting
    </span>
  );
}
