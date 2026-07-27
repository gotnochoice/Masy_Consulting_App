import Link from "next/link";
import { db } from "@/lib/db";
import { MasyLogo } from "@/components/masy-logo";
import { ResetPasswordTokenForm } from "./reset-password-token-form";

export default async function ResetPasswordTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resetToken = await db.passwordResetToken.findUnique({ where: { token } });
  const valid = !!resetToken && !resetToken.usedAt && resetToken.expiresAt > new Date();

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-2 px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-paper shadow-sm">
        <div className="p-8">
          <div className="mb-6">
            <MasyLogo className="text-xl" />
            <p className="mt-1 text-sm text-slate">Set a new password</p>
          </div>
          {valid ? (
            <ResetPasswordTokenForm token={token} />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-ink">This reset link is invalid or has expired.</p>
              <Link href="/forgot-password" className="text-sm font-medium text-indigo hover:text-indigo-light">
                Request a new link
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
