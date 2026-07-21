import { MasyMark } from "./masy-mark";

export function MasyLogo({ className = "text-lg", light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-extrabold ${light ? "text-white" : "text-indigo"} ${className}`}>
      <MasyMark className="h-[1em] w-[0.7em]" />
      Masy<span className="text-orange">.</span>Consulting
    </span>
  );
}
