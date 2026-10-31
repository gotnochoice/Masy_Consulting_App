import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CareersHeader } from "@/components/careers-header";
import { GroupApplyForm } from "./group-apply-form";
import { submitGroupApplication } from "./actions";

export default async function GroupApplyPage({
  params,
}: {
  params: Promise<{ companySlug: string; groupSlug: string }>;
}) {
  const { companySlug, groupSlug } = await params;

  const group = await db.applicationGroup.findFirst({
    where: { slug: groupSlug, clientOrg: { slug: companySlug } },
    include: {
      clientOrg: true,
      questions: { orderBy: { order: "asc" } },
      roles: {
        where: { acceptingApplications: true, mode: "FORMAL" },
        include: { questions: { orderBy: { order: "asc" } }, questionSections: { orderBy: { order: "asc" } } },
        orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      },
    },
  });

  if (!group) notFound();

  const submitWithSlugs = submitGroupApplication.bind(null, companySlug, groupSlug);

  return (
    <main className="min-h-screen bg-paper-2">
      <CareersHeader />

      <div className="flex justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-2xl">
          {group.roles.length === 0 ? (
            <div className="rounded-card border border-border bg-paper p-8 text-center shadow-sm sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange">No open roles</p>
              <h1 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">{group.title}</h1>
              <p className="mt-1 text-sm text-slate">{group.clientOrg.name}</p>
              <p className="mt-6 text-sm text-slate">
                There are no roles accepting applications here right now. Thank you for your interest.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center sm:text-left">
                <span className="mx-auto mb-3 block h-1 w-9 rounded-full bg-orange sm:mx-0" />
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo">Open roles</p>
                <h1 className="mt-2 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">{group.title}</h1>
                <p className="mt-2 text-sm text-slate">
                  {group.clientOrg.name} · Recruitment managed by Masy Consulting
                </p>
              </div>

              <div className="relative overflow-hidden rounded-card border border-border bg-paper p-6 shadow-[0_8px_30px_rgba(26,19,48,0.08)] sm:p-10">
                <div className="absolute inset-x-0 top-0 h-1 bg-indigo" />
                <GroupApplyForm
                  action={submitWithSlugs}
                  companyName={group.clientOrg.name}
                  generalQuestions={group.questions}
                  roles={group.roles}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
