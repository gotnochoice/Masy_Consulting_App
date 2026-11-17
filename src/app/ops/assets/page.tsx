import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-paper-2 text-slate border border-border",
  ISSUED: "bg-indigo-tint text-indigo",
  RETURNED: "bg-paper-2 text-slate border border-border",
  LOST: "bg-orange-light/40 text-orange",
  DAMAGED: "bg-orange-light/40 text-orange",
  IN_REPAIR: "bg-orange-light/40 text-orange",
};

export default async function OpsAssetsPage() {
  await requireRole("MASY_OPS");

  const assets = await db.companyAsset.findMany({
    where: { itemType: { not: "NO_EQUIPMENT_ISSUED" } },
    include: { employee: { include: { clientOrg: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Asset register</h1>
        <p className="text-sm text-slate">Every piece of company property, who holds it, and its status.</p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Item</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Serial/IMEI</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Custodian</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Company</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Issued</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-paper-2">
                <td className="px-3 py-2.5 font-medium text-ink">
                  {asset.itemType}{asset.brand ? ` -- ${asset.brand}` : ""}{asset.model ? ` ${asset.model}` : ""}
                </td>
                <td className="px-3 py-2.5 text-slate">{asset.serialOrImei || "--"}</td>
                <td className="px-3 py-2.5">
                  <Link href={`/ops/employees/${asset.employeeId}/edit`} className="font-medium text-indigo hover:text-indigo-light">
                    {asset.employee.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-slate">{asset.employee.clientOrg.name}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-btn px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[asset.status]}`}>
                    {asset.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate">{asset.issueDate ? asset.issueDate.toLocaleDateString() : "--"}</td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-light">No equipment recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
