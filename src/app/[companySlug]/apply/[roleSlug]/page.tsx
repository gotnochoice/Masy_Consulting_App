import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ApplyForm } from "./apply-form";
import { submitApplication } from "./actions";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ companySlug: string; roleSlug: string }>;
}) {
  const { companySlug, roleSlug } = await params;

  const role = await db.openRole.findFirst({
    where: { slug: roleSlug, clientOrg: { slug: companySlug } },
    include: {
      clientOrg: true,
      questions: { orderBy: { order: "asc" } },
      questionSections: { orderBy: { order: "asc" } },
    },
  });

  if (!role) notFound();

  const submitWithSlugs = submitApplication.bind(null, companySlug, roleSlug);

  return (
    <main className="min-h-screen bg-paper-2">
      <div className="border-b border-ink/10 bg-ink px-6 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/masy-mark.png" alt="" className="h-6 w-6" />
            </span>
            <span className="text-lg font-extrabold text-white">Masy Consulting</span>
          </div>
          <span className="hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/60 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-orange" />
            Careers
          </span>
        </div>
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
                <span className="mx-auto mb-3 block h-1 w-9 rounded-full bg-orange sm:mx-0" />
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo">Open role</p>
                <h1 className="mt-2 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">{role.title}</h1>
                <p className="mt-2 text-sm text-slate">
                  {role.clientOrg.name} · Recruitment managed by Masy Consulting
                </p>
              </div>

              <div className="relative overflow-hidden rounded-card border border-border bg-paper p-6 shadow-[0_8px_30px_rgba(26,19,48,0.08)] sm:p-10">
                <div className="absolute inset-x-0 top-0 h-1 bg-indigo" />
                {role.description && (
                  <p className="mb-8 whitespace-pre-line text-sm leading-relaxed text-slate">{role.description}</p>
                )}
                <ApplyForm
                  action={submitWithSlugs}
                  questions={role.questions}
                  questionSections={role.questionSections}
                  roleTitle={role.title}
                  companyName={role.clientOrg.name}
                  askYearsExperience={role.askYearsExperience}
                  askExpectedPay={role.askExpectedPay}
                  askHowHeard={role.askHowHeard}
                  askResumeLink={role.askResumeLink}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
