export function MasyLogo({ className = "text-lg" }: { className?: string }) {
  return (
    <span className={`font-bold text-indigo ${className}`}>
      Masy<span className="text-orange">.</span>Consulting
    </span>
  );
}
