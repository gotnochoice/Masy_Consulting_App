export function MasyMark({ className = "h-6 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 28" fill="none" className={className} aria-hidden="true">
      <path d="M9 0H13.5L6.5 28H2L9 0Z" fill="currentColor" />
      <path d="M17.5 0H20L13 28H10.5L17.5 0Z" fill="var(--color-orange)" />
    </svg>
  );
}
