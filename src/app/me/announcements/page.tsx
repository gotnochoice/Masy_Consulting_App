import { Megaphone } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";

export default async function MyAnnouncementsPage() {
  const session = await requireRole("EMPLOYEE");

  const employee = session.user.employeeId
    ? await db.employee.findUnique({ where: { id: session.user.employeeId }, select: { clientOrgId: true } })
    : null;

  const announcements = await db.announcement.findMany({
    where: { OR: [{ clientOrgId: null }, { clientOrgId: employee?.clientOrgId ?? "__none__" }] },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Announcements</h1>
        <p className="text-sm text-slate">Updates from Masy and your organization.</p>
      </div>

      <div className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-card border border-border bg-paper p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-light/40 text-orange">
                <Megaphone className="h-4 w-4" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{a.title}</p>
                <p className="mb-2 text-xs text-slate-light">
                  {a.authorLabel} · {a.createdAt.toLocaleDateString()}
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate">{a.body}</p>
              </div>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <p className="rounded-card border border-border bg-paper px-5 py-8 text-center text-sm text-slate-light">
            No announcements yet.
          </p>
        )}
      </div>
    </div>
  );
}
