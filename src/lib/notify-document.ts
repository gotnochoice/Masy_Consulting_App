import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { sendNotification } from "@/lib/email";

export async function notifyEmployeeDocumentsShared(employeeIds: string[], label: string) {
  const origin = await getOrigin();

  const employees = await db.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, name: true, email: true, clientOrgId: true },
  });

  await Promise.all(
    employees.map((employee) =>
      sendNotification(
        employee.email,
        "A new document has been shared with you",
        `Masy HR shared a new document with you: ${label}.\n\nView it here: ${origin}/me/documents`,
      ),
    ),
  );

  const clientOrgIds = [...new Set(employees.map((e) => e.clientOrgId))];
  const clientUsers = await db.user.findMany({
    where: { clientOrgId: { in: clientOrgIds }, role: "CLIENT" },
    select: { email: true, clientOrgId: true },
  });

  const clientEmailsByOrg = new Map<string, string[]>();
  for (const user of clientUsers) {
    if (!user.clientOrgId) continue;
    const list = clientEmailsByOrg.get(user.clientOrgId) ?? [];
    list.push(user.email);
    clientEmailsByOrg.set(user.clientOrgId, list);
  }

  await Promise.all(
    clientOrgIds.map((orgId) => {
      const emails = clientEmailsByOrg.get(orgId);
      if (!emails || emails.length === 0) return Promise.resolve();
      const names = employees.filter((e) => e.clientOrgId === orgId).map((e) => e.name).join(", ");
      return sendNotification(
        emails,
        "A new document was shared with your team",
        `Masy HR shared a new document (${label}) for: ${names}.\n\nView it here: ${origin}/client/staff`,
      );
    }),
  );
}
