import type { ReactNode } from "react";

const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;

/** Splits on **bold** markers and returns React nodes with <strong> for the bold parts. */
export function formatBoldText(text: string): ReactNode[] {
  const parts = text.split(BOLD_PATTERN);
  // String.split with a capturing group interleaves the captured groups into the array,
  // so odd indices are always the text that was between **, even indices are plain text.
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

/** Plain-text fallback for previews/truncated contexts where markup would look wrong. */
export function stripBoldMarkers(text: string): string {
  return text.replace(BOLD_PATTERN, "$1");
}
