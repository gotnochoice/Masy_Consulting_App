import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { leaveDaysBetween, formatDateShort } from "@/lib/leave";
import { LeaveStatusBadge } from "@/components/leave-status-badge";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { requestLeave } from "./actions";

export default async function MyLeavePage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;

  if (!employeeId) {
    return <p className="text-sm text-slate">No profile found yet. Contact your Masy HR contact.</p>;
  }

  const [employee, requests] = await Promise.all([
    db.employee.findUnique({ where: { id: employeeId } }),
    db.leaveRequest.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Leave</h1>
        <p className="text-sm text-slate">
          Balance: <span className="font-mono text-ink">{employee?.leaveBalanceDays ?? 0} days</span> remaining
        </p>
      </div>

      <div className="rounded-card border border-border bg-paper shadow-sm p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Request leave</h2>
        <form action={requestLeave} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} htmlFor="type">Type</label>
              <select id="type" name="type" required defaultValue="ANNUAL" className={inputClass}>
                <option value="ANNUAL">Annual</option>
                <option value="SICK">Sick</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="startDate">Start date</label>
              <input id="startDate" name="startDate" type="date" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="endDate">End date</label>
              <input id="endDate" name="endDate" type="date" required className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="reason">Reason (optional)</label>
            <textarea id="reason" name="reason" rows={2} className={inputClass} />
          </div>
          <button type="submit" className={buttonClass}>Submit request</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Type</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Dates</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Days</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium capitalize text-ink">{r.type.toLowerCase()}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate">
                  {formatDateShort(r.startDate)} – {formatDateShort(r.endDate)}
                </td>
                <td className="px-4 py-3 text-slate">{leaveDaysBetween(r.startDate, r.endDate)}</td>
                <td className="px-4 py-3"><LeaveStatusBadge status={r.status} /></td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate">No leave requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
