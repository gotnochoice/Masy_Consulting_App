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
    <main className="flex min-h-screen justify-center bg-indigo-tint px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <MasyLogo className="text-xl" />
          <p className="mt-1 text-sm text-slate">Recruitment handled by Masy Consulting on behalf of our client.</p>
        </div>

        <div className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] p-8">
          {!role.acceptingApplications ? (
            <div className="text-center">
              <h1 className="text-2xl font-extrabold text-ink">{role.title}</h1>
              <p className="mt-1 text-sm text-slate">{role.clientOrg.name}</p>
              <p className="mt-6 text-sm text-slate">
                This role is no longer accepting applications. Thank you for your interest.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-ink">{role.title}</h1>
              <p className="mt-1 text-sm text-slate">{role.clientOrg.name}</p>
              {role.description && <p className="mt-4 whitespace-pre-line text-sm text-slate">{role.description}</p>}
              <div className="mt-6">
                <ApplyForm action={submitWithSlug} questions={role.questions} />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
