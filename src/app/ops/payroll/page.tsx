import Link from "next/link";
import { Wallet, Users, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/currency";
import { StatCard } from "@/components/stat-card";
import { EmployeeAvatar } from "@/components/employee-avatar";

export default async function OpsPayrollPage() {
  await requireRole("MASY_OPS");

  const orgs = await db.clientOrg.findMany({
    orderBy: { name: "asc" },
    include: {
      employees: {
        where: { status: { not: "OFFBOARDED" } },
        orderBy: { name: "asc" },
      },
    },
  });

  const allEmployees = orgs.flatMap((o) => o.employees);
  const totalPayroll = allEmployees.reduce((sum, e) => sum + Number(e.salary ?? 0), 0);
  const missingBankDetails = allEmployees.filter((e) => !e.bankAccountNumber).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Payroll</h1>
          <p className="text-sm text-slate">Salary and bank details for every active staff member, by client.</p>
        </div>
        <Link
          href="/ops/payroll/export"
          className="rounded-btn border border-border px-3 py-2 text-xs font-medium text-slate hover:text-ink"
        >
          Export CSV
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Monthly payroll" value={formatNaira(totalPayroll)} icon={Wallet} />
        <StatCard label="Staff on payroll" value={allEmployees.length} icon={Users} />
        <StatCard
          label="Missing bank details"
          value={missingBankDetails}
          icon={AlertTriangle}
          tone={missingBankDetails > 0 ? "orange" : "indigo"}
        />
      </div>

      <div className="space-y-6">
        {orgs.map((org) => {
          if (org.employees.length === 0) return null;
          const orgTotal = org.employees.reduce((sum, e) => sum + Number(e.salary ?? 0), 0);
          return (
            <div key={org.id} className="rounded-card border border-border bg-paper">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">{org.name}</h2>
                <p className="text-xs text-slate-light">
                  {org.employees.length} staff · {formatNaira(orgTotal)}/mo
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-xs">
                  <thead className="bg-paper-2">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Role</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Salary</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Bank</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Account name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Account number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {org.employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-paper-2">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <EmployeeAvatar name={employee.name} photoUrl={employee.photoUrl} />
                            <span className="font-medium text-ink">{employee.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate">{employee.roleTitle}</td>
                        <td className="px-4 py-2.5 text-slate">{formatNaira(employee.salary)}</td>
                        <td className="px-4 py-2.5 text-slate">{employee.bankName || "-"}</td>
                        <td className="px-4 py-2.5 text-slate">{employee.bankAccountHolderName || employee.name}</td>
                        <td className="px-4 py-2.5">
                          {employee.bankAccountNumber ? (
                            <span className="text-slate">{employee.bankAccountNumber}</span>
                          ) : (
                            <span className="rounded-btn bg-orange-light/40 px-2 py-0.5 text-xs font-medium text-orange">
                              Missing
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {allEmployees.length === 0 && (
          <p className="rounded-card border border-dashed border-border px-5 py-8 text-center text-sm text-slate-light">
            No active staff on payroll yet.
          </p>
        )}
      </div>
    </div>
  );
}
