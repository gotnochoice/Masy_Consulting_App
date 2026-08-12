import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { createCompany, deleteCompany, deactivateCompany, reactivateCompany } from "./actions";
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
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Companies</h1>
        <p className="text-sm text-slate">Every client organization on the platform.</p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Name</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Staff</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Client login</th>
              <th className="px-4 py-2.5" />
              <th className="px-4 py-2.5" />
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orgs.map((org) => {
              const deleteCompanyWithId = deleteCompany.bind(null, org.id);
              const deactivateWithId = deactivateCompany.bind(null, org.id);
              const reactivateWithId = reactivateCompany.bind(null, org.id);
              const isActive = org.status === "active";
              return (
              <tr key={org.id} className={`hover:bg-paper-2 ${isActive ? "" : "opacity-60"}`}>
                <td className="px-4 py-3 font-medium text-ink">{org.name}</td>
                <td className="px-4 py-3 text-slate">{org._count.employees}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-btn px-2.5 py-0.5 text-xs font-medium ${
                      isActive ? "bg-indigo-tint text-indigo" : "border border-border bg-paper-2 text-slate"
                    }`}
                  >
                    {org.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    {org.users.map((user) => (
                      <div key={user.id} className="flex items-center justify-end gap-3">
                        <span className="text-xs text-slate">{user.email}</span>
                        <ResetPasswordForm userId={user.id} />
                      </div>
                    ))}
                    <InviteClientForm clientOrgId={org.id} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/ops/employees?org=${org.id}`}
                    className="text-sm font-medium text-indigo hover:text-indigo-light"
                  >
                    Add staff
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  {isActive ? (
                    <ConfirmSubmitButton
                      action={deactivateWithId}
                      confirmMessage={`Deactivate ${org.name}? Every login tied to this company, the client account and all their staff, will be blocked immediately. Their data stays intact and you can reactivate anytime.`}
                      className="text-sm font-medium text-slate hover:text-orange"
                    >
                      Deactivate
                    </ConfirmSubmitButton>
                  ) : (
                    <form action={reactivateWithId}>
                      <button type="submit" className="text-sm font-medium text-indigo hover:text-indigo-light">
                        Reactivate
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <ConfirmSubmitButton
                    action={deleteCompanyWithId}
                    confirmMessage={`Delete ${org.name} and ALL its data, ${org._count.employees} employee(s), attendance, leave, reviews, recruitment, everything? This can't be undone.`}
                    className="text-xs font-medium text-slate-light hover:text-orange"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </td>
              </tr>
              );
            })}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-light">No companies yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-card border border-border bg-paper p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Add company</h2>
        <form action={createCompany} className="flex flex-wrap items-end gap-3">
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
