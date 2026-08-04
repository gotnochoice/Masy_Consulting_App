export const SOCIAL_PLATFORMS: { name: string; href: string; icon: React.ReactNode }[] = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/masy_consulting",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61588714112639",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M22 12a10 10 0 1 0-11.5 9.87v-6.98H7.9V12h2.6V9.8c0-2.56 1.53-3.98 3.87-3.98 1.12 0 2.3.2 2.3.2v2.5h-1.3c-1.28 0-1.68.8-1.68 1.61V12h2.86l-.46 2.89h-2.4v6.98A10 10 0 0 0 22 12z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@masy_consulting",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M16.6 5.82A4.28 4.28 0 0 1 13.61 2h-3.32v14.6a2.6 2.6 0 1 1-2.6-2.6c.28 0 .55.04.8.13V10.9a5.87 5.87 0 0 0-.8-.05A5.85 5.85 0 1 0 13.5 16.7V9.4a7.6 7.6 0 0 0 4.44 1.43V7.5a4.26 4.26 0 0 1-1.34-1.68z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/masyconsulting/",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
      </svg>
    ),
  },
];

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {SOCIAL_PLATFORMS.map((s) => (
        <a
          key={s.name}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Follow Masy Consulting on ${s.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-btn bg-indigo-tint text-indigo transition-colors hover:bg-indigo hover:text-white"
        >
          {s.icon}
        </a>
      ))}
    </div>
  );
}

// Named links (not just icons) so applicants can see exactly which platform each one is
// before checking the required "I follow" box.
export function SocialLinksList({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {SOCIAL_PLATFORMS.map((s) => (
        <a
          key={s.name}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-btn border border-border px-3 py-2 text-sm text-ink transition-colors hover:border-indigo/40 hover:text-indigo"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-btn bg-indigo-tint text-indigo">
            {s.icon}
          </span>
          {s.name}
        </a>
      ))}
    </div>
  );
}
