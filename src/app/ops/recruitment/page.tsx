import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { RoleStageBadge } from "@/components/stage-badge";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { createRole } from "./actions";

export default async function OpsRecruitmentPage() {
  await requireRole("MASY_OPS");

  const [roles, orgs] = await Promise.all([
    db.openRole.findMany({
      include: { clientOrg: true, _count: { select: { candidates: true } } },
      orderBy: [{ clientOrg: { name: "asc" } }, { createdAt: "desc" }],
    }),
    db.clientOrg.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Recruitment</h1>
        <p className="text-sm text-slate">Open roles and candidate pipelines across every client organization.</p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Role</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Organization</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Stage</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Candidates</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-paper-2">
                <td className="px-4 py-3 font-medium text-ink">{role.title}</td>
                <td className="px-4 py-3 text-slate">{role.clientOrg.name}</td>
                <td className="px-4 py-3"><RoleStageBadge stage={role.stage} /></td>
                <td className="px-4 py-3 text-slate">{role._count.candidates}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/ops/recruitment/${role.id}`} className="text-sm font-medium text-indigo hover:text-indigo-light">
                    View pipeline
                  </Link>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate">No open roles yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-xl rounded-card border border-border bg-paper shadow-sm p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Open a role</h2>
        <form action={createRole} className="flex items-end gap-4">
          <div className="flex-1">
            <label className={labelClass} htmlFor="title">Role title</label>
            <input id="title" name="title" required className={inputClass} />
          </div>
          <div className="flex-1">
            <label className={labelClass} htmlFor="clientOrgId">Organization</label>
            <select id="clientOrgId" name="clientOrgId" required defaultValue="" className={inputClass}>
              <option value="" disabled>Select organization</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={buttonClass}>Open role</button>
        </form>
      </div>
    </div>
  );
}
