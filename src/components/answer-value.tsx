import { linkify } from "@/lib/linkify";
import { resolveImageUrl } from "@/lib/drive-image";

// Renders a candidate/employee's answer to a custom question. A PHOTO-type answer is a
// blob/Drive URL that should show as an image, not linkified text like every other type.
export function AnswerValue({ type, value, label }: { type: string; value: string; label: string }) {
  if (type === "PHOTO") {
    return (
      <a href={resolveImageUrl(value)} target="_blank" rel="noreferrer" className="group mt-1 inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element -- external Blob/Drive URL thumbnail, not worth next/image config */}
        <img
          src={resolveImageUrl(value)}
          alt={label}
          className="max-h-56 rounded-card border border-border object-contain transition-opacity group-hover:opacity-90"
        />
        <span className="mt-1 block text-xs font-medium text-indigo group-hover:text-indigo-light">
          View full size ↗
        </span>
      </a>
    );
  }
  return <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{linkify(value)}</p>;
}
