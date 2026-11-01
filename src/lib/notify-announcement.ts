import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { sendNotification } from "@/lib/email";

export async function notifyAnnouncementCreated(announcement: {
  clientOrgId: string | null;
  title: string;
  body: string;
  authorLabel: string;
}) {
  const origin = await getOrigin();

  const employees = await db.employee.findMany({
    where: {
      status: "ACTIVE",
      ...(announcement.clientOrgId ? { clientOrgId: announcement.clientOrgId } : {}),
    },
    select: { email: true },
  });

  if (employees.length === 0) return;

  await sendNotification(
    employees.map((e) => e.email),
    `New announcement: ${announcement.title}`,
    `${announcement.authorLabel} posted a new announcement.\n\n${announcement.title}\n\n${announcement.body}\n\n` +
      `View it here: ${origin}/me/announcements`,
  );
}
