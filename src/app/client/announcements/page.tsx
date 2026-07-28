import { Megaphone } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { createAnnouncement, deleteAnnouncement } from "./actions";

export default async function ClientAnnouncementsPage() {
  const session = await requireRole("CLIENT");

  const announcements = await db.announcement.findMany({
    where: { OR: [{ clientOrgId: null }, { clientOrgId: session.user.clientOrgId ?? "__none__" }] },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Announcements</h1>
        <p className="text-sm text-slate">Updates from Masy, plus anything you post for your own team.</p>
      </div>

      <div className="rounded-card border border-border bg-paper p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">New announcement</h2>
        <form action={createAnnouncement} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="title">Title</label>
            <input id="title" name="title" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="body">Message</label>
            <textarea id="body" name="body" rows={3} required className={inputClass} />
          </div>
          <button type="submit" className={buttonClass}>Post to your team</button>
        </form>
      </div>

      <div className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-card border border-border bg-paper p-5">
            <div className="flex items-start justify-between gap-4">
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
              {a.authorRole === "CLIENT" && (
                <ConfirmSubmitButton
                  action={deleteAnnouncement.bind(null, a.id)}
                  confirmMessage={`Delete the announcement "${a.title}"?`}
                  className="shrink-0 text-xs font-medium text-slate-light hover:text-orange"
                >
                  Delete
                </ConfirmSubmitButton>
              )}
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
