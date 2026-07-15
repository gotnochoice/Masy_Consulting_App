import { requireRole } from "@/lib/rbac";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("MASY_OPS");

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardHeader roleLabel="Masy HR Ops" />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
