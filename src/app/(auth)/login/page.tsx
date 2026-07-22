import { LoginForm } from "./login-form";
import { MasyLogo } from "@/components/masy-logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-2 px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-paper shadow-sm">
        <div className="p-8">
          <div className="mb-6">
            <MasyLogo className="text-xl" />
            <p className="mt-1 text-sm text-slate">HR Platform — sign in to continue</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
