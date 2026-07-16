import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-2 px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-paper p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo text-base font-bold text-white">
            M
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink">Masy Consulting HR</h1>
            <p className="text-sm text-slate">Sign in to continue</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
