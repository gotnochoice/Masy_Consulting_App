import { Wallet, Users } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/currency";
import { StatCard } from "@/components/stat-card";
import { EmployeeAvatar } from "@/components/employee-avatar";

export default async function ClientPayrollPage() {
  const session = await requireRole("CLIENT");

  const employees = await db.employee.findMany({
    where: { clientOrgId: session.user.clientOrgId ?? "__none__", status: { not: "OFFBOARDED" } },
    orderBy: { name: "asc" },
  });

  const totalPayroll = employees.reduce((sum, e) => sum + Number(e.salary ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Payroll</h1>
        <p className="text-sm text-slate">
          Salary and bank details on file for your team. Not visible to staff themselves.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Monthly payroll" value={formatNaira(totalPayroll)} icon={Wallet} />
        <StatCard label="Staff on payroll" value={employees.length} icon={Users} />
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper">
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
            {employees.map((employee) => (
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
                <td className="px-4 py-2.5 text-slate">{employee.bankAccountNumber || "-"}</td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-light">No staff on record yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
