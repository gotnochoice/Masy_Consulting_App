import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  await requireRole("MASY_OPS");

  const employees = await db.employee.findMany({
    where: { status: { not: "OFFBOARDED" } },
    orderBy: [{ clientOrg: { name: "asc" } }, { name: "asc" }],
    include: { clientOrg: true },
  });

  const headers = ["Organization", "Name", "Role", "Salary", "Bank", "Account name", "Account number"];

  const rows = employees.map((e) => [
    e.clientOrg.name,
    e.name,
    e.roleTitle,
    e.salary?.toString() ?? "",
    e.bankName ?? "",
    e.bankAccountHolderName || e.name,
    e.bankAccountNumber ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => csvEscape(String(v))).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
