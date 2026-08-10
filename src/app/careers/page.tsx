import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { CareersHeader } from "@/components/careers-header";
import { SocialLinks } from "@/components/social-links";
import { stripBoldMarkers } from "@/lib/format-text";

export const metadata: Metadata = {
  title: "Careers | Masy Consulting",
  description: "Open roles Masy Consulting is currently recruiting for on behalf of its clients.",
};

// Roles open/close on their own schedule via the Ops dashboard; this must never be statically cached.
export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const roles = await db.openRole.findMany({
    where: { acceptingApplications: true },
    include: { clientOrg: true },
    orderBy: [{ clientOrg: { name: "asc" } }, { createdAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-paper-2">
      <CareersHeader maxWidthClass="max-w-3xl" />

      <div className="flex justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-3xl">
          <div className="mb-8 text-center sm:text-left">
            <span className="mx-auto mb-3 block h-1 w-9 rounded-full bg-orange sm:mx-0" />
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo">Open roles</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">Careers</h1>
            <p className="mt-2 text-sm text-slate">
              Masy Consulting handles recruitment for the clients below. Find a role and apply directly.
            </p>
          </div>

          {roles.length === 0 ? (
            <div className="rounded-card border border-border bg-paper p-8 text-center shadow-sm sm:p-12">
              <p className="text-sm text-slate">There are no open roles right now. Check back soon.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <Link
                  key={role.id}
                  href={`/${role.clientOrg.slug}/apply/${role.slug}`}
                  className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-card border border-border bg-paper p-5 shadow-sm transition-shadow hover:shadow-[0_8px_30px_rgba(26,19,48,0.08)] sm:p-6"
                >
                  <span className="absolute inset-y-0 left-0 w-1 bg-indigo opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">{role.clientOrg.name}</p>
                    <p className="mt-1 text-base font-bold text-ink">{role.title}</p>
                    {role.location && <p className="mt-0.5 text-xs text-slate">📍 {role.location}</p>}
                    {role.description && (
                      <p className="mt-1 line-clamp-1 text-sm text-slate">{stripBoldMarkers(role.description)}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-indigo">View role &rarr;</span>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-slate">Follow us on social media to hear about new roles as they open.</p>
            <SocialLinks />
          </div>
        </div>
      </div>
    </main>
  );
}
