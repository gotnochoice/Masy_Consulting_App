const SIZES = {
  sm: "h-8 w-8 text-xs",
  lg: "h-16 w-16 text-xl",
} as const;

export function EmployeeAvatar({
  name,
  photoUrl,
  size = "sm",
}: {
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
}) {
  const dimensions = SIZES[size];

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external Blob URL thumbnail, not worth next/image config
      <img src={photoUrl} alt={name} className={`${dimensions} shrink-0 rounded-full object-cover`} />
    );
  }

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center rounded-full bg-indigo-tint font-semibold text-indigo`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
