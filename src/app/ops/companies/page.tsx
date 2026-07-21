import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { createCompany } from "./actions";
import { InviteClientForm } from "./invite-client-form";

export default async function OpsCompaniesPage() {
  await requireRole("MASY_OPS");

  const orgs = await db.clientOrg.findMany({
    include: {
      _count: { select: { employees: true } },
      users: { where: { role: "CLIENT" } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Companies</h1>
        <p className="text-sm text-slate">Every client organization on the platform.</p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)]">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Name</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Staff</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Status</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Client login</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-paper-2">
                <td className="px-4 py-3 font-medium text-ink">{org.name}</td>
                <td className="px-4 py-3 text-slate">{org._count.employees}</td>
                <td className="px-4 py-3">
                  <span className="rounded-btn bg-indigo-tint px-2.5 py-0.5 font-mono text-xs font-medium text-indigo">
                    {org.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {org.users.length > 0 ? (
                    <span className="text-xs text-slate">{org.users[0].email}</span>
                  ) : (
                    <InviteClientForm clientOrgId={org.id} />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/ops/employees?org=${org.id}`}
                    className="text-sm font-medium text-indigo hover:text-indigo-light"
                  >
                    Add staff
                  </Link>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate">No companies yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Add company</h2>
        <form action={createCompany} className="flex items-end gap-3">
          <div className="flex-1">
            <label className={labelClass} htmlFor="name">Company name</label>
            <input id="name" name="name" required className={inputClass} />
          </div>
          <button type="submit" className={buttonClass}>Add company</button>
        </form>
      </div>
    </div>
  );
}
