import { Building2 } from "lucide-react";

const SIZES = {
  sm: "h-8 w-8",
  lg: "h-12 w-12",
} as const;

export function ClientLogo({
  name,
  logoUrl,
  size = "sm",
}: {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
}) {
  const dimensions = SIZES[size];

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external Blob URL thumbnail, not worth next/image config
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={`${dimensions} shrink-0 rounded-lg border border-border object-contain bg-paper p-1`}
      />
    );
  }

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center rounded-lg bg-indigo-tint text-indigo`}
    >
      <Building2 className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} strokeWidth={2} />
    </div>
  );
}
