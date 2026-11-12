import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { createApplicationGroup } from "./actions";

export default async function ApplicationGroupsPage() {
  await requireRole("MASY_OPS");

  const [groups, orgs] = await Promise.all([
    db.applicationGroup.findMany({
      include: { clientOrg: true, _count: { select: { roles: true } } },
      orderBy: [{ clientOrg: { name: "asc" } }, { createdAt: "desc" }],
    }),
    db.clientOrg.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Application groups</h1>
        <p className="text-sm text-slate">
          One shared apply link for two or more roles at a company. Applicants pick which role they&rsquo;re
          applying for, then answer the group&rsquo;s shared questions plus that role&rsquo;s own questions.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-card border border-border bg-paper px-4 py-8 text-center text-sm text-slate-light">
          No application groups yet.
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/ops/recruitment/groups/${group.id}`}
              className="flex items-center justify-between rounded-card border border-border bg-paper px-4 py-3 hover:shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-ink">{group.title}</p>
                <p className="text-xs text-slate-light">
                  {group.clientOrg.name} · {group._count.roles} role{group._count.roles === 1 ? "" : "s"} in this group
                </p>
              </div>
              <span className="text-sm font-medium text-indigo">Manage &rarr;</span>
            </Link>
          ))}
        </div>
      )}

      <div className="max-w-lg rounded-card border border-border bg-paper p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Create a group</h2>
        <form action={createApplicationGroup} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className={labelClass} htmlFor="title">Group title</label>
            <input id="title" name="title" placeholder="e.g. September Hiring" required className={inputClass} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className={labelClass} htmlFor="clientOrgId">Organization</label>
            <select id="clientOrgId" name="clientOrgId" required defaultValue="" className={inputClass}>
              <option value="" disabled>Select organization</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={buttonClass}>Create group</button>
        </form>
        <p className="mt-3 text-xs text-slate-light">
          Add roles to the group and set its shared questions after creating it. Only formal roles (not informal
          ones) can be added to a group.
        </p>
      </div>
    </div>
  );
}
