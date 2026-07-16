import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { createCompany } from "./actions";

export default async function OpsCompaniesPage() {
  await requireRole("MASY_OPS");

  const orgs = await db.clientOrg.findMany({
    include: { _count: { select: { employees: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Companies</h1>
        <p className="text-sm text-slate">Every client organization on the platform.</p>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-paper shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Name</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Staff</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-paper-2">
                <td className="px-4 py-3 font-medium text-ink">{org.name}</td>
                <td className="px-4 py-3 text-slate">{org._count.employees}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-indigo-tint px-2.5 py-0.5 font-mono text-xs font-medium text-indigo">
                    {org.status}
                  </span>
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
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate">No companies yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-card border border-border bg-paper shadow-sm p-6">
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
