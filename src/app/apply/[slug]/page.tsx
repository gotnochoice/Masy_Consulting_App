import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MasyLogo } from "@/components/masy-logo";
import { ApplyForm } from "./apply-form";
import { submitApplication } from "./actions";

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const role = await db.openRole.findUnique({
    where: { slug },
    include: { clientOrg: true, questions: { orderBy: { order: "asc" } } },
  });

  if (!role) notFound();

  const submitWithSlug = submitApplication.bind(null, slug);

  return (
    <main className="min-h-screen bg-paper-2">
      <div className="flex items-center justify-between border-b border-ink/10 bg-ink px-6 py-4">
        <MasyLogo className="text-lg" light />
        <span className="hidden text-xs font-medium uppercase tracking-widest text-white/50 sm:inline">
          Careers
        </span>
      </div>

      <div className="flex justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-2xl">
          {!role.acceptingApplications ? (
            <div className="rounded-card border border-border bg-paper p-8 text-center shadow-sm sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange">Applications closed</p>
              <h1 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">{role.title}</h1>
              <p className="mt-1 text-sm text-slate">{role.clientOrg.name}</p>
              <p className="mt-6 text-sm text-slate">
                This role is no longer accepting applications. Thank you for your interest.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center sm:text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo">Open role</p>
                <h1 className="mt-2 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">{role.title}</h1>
                <p className="mt-2 text-sm text-slate">
                  {role.clientOrg.name} · Recruitment managed by Masy Consulting
                </p>
              </div>

              <div className="rounded-card border border-border bg-paper p-6 shadow-sm sm:p-10">
                {role.description && (
                  <p className="mb-8 whitespace-pre-line text-sm leading-relaxed text-slate">{role.description}</p>
                )}
                <ApplyForm
                  action={submitWithSlug}
                  questions={role.questions}
                  roleTitle={role.title}
                  companyName={role.clientOrg.name}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
