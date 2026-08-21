import { db } from "@/lib/db";
import { MasyLogo } from "@/components/masy-logo";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.onboardingInvite.findUnique({
    where: { token },
    include: { employee: { include: { clientOrg: true } } },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-2 px-4 py-10">
      <div className="w-full max-w-lg rounded-card border border-border bg-paper shadow-sm">
        <div className="p-8">
          <div className="mb-6">
            <MasyLogo className="text-xl" />
          </div>
          {invite ? (
            <OnboardingForm
              token={token}
              name={invite.employee.name}
              email={invite.employee.email}
              orgName={invite.employee.clientOrg.name}
              initiallyValid={!invite.completedAt && invite.expiresAt > new Date()}
              initiallyCompleted={!!invite.completedAt}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-ink">This onboarding link is invalid.</p>
              <p className="text-sm text-slate">Ask Masy Consulting to send you a new link.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
