import { requireRole } from "@/lib/rbac";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  await requireRole("CLIENT");

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardHeader roleLabel="Client" />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
