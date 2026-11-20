import { db } from "@/lib/db";
import { sendNotification, sendOpsNotification } from "@/lib/email";
import { getOrigin } from "@/lib/url";

const REMINDER_DAYS = [7, 3, 1, 0];

function daysUntil(date: Date): number {
  const ms = date.getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Nudges a new hire to finish onboarding before their start date -- 7, 3, and 1 day before, and
// the day itself. Called daily (see /api/cron/data-retention, which already runs every day --
// reusing that slot rather than adding another cron entry).
export async function sendCommencementReminders(): Promise<number> {
  const processes = await db.onboardingProcess.findMany({
    where: { completedAt: null },
    include: { employee: { select: { id: true, name: true, email: true, commencementReminderLog: true } } },
  });

  const origin = await getOrigin();
  let sent = 0;

  for (const process of processes) {
    const days = daysUntil(process.commencementDate);
    if (!REMINDER_DAYS.includes(days)) continue;

    const already = process.employee.commencementReminderLog.includes(days);
    if (already) continue;

    const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    await sendNotification(
      process.employee.email,
      "Finish your onboarding before your start date",
      `Hi ${process.employee.name},\n\nYour start date is ${when}, and your onboarding checklist isn't finished yet.\n\n` +
        `Please complete it as soon as you can: ${origin}/me/onboarding\n\n` +
        "If you've already submitted everything, this is likely just waiting on our team to verify it -- no action needed from you.",
    );
    await db.employee.update({
      where: { id: process.employee.id },
      data: { commencementReminderLog: { push: days } },
    });
    sent++;
  }

  return sent;
}

// Fires the moment the employee's SIGNATURE step is submitted -- an immediate alert, distinct
// from the daily HR digest, since this specific countersignature is time-sensitive (nothing
// else in onboarding can finish until it happens).
export async function notifyCountersignRequested(employeeId: string): Promise<void> {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { name: true, clientOrg: { select: { name: true, onboardingCountersignerRole: true } } },
  });
  if (!employee) return;

  const origin = await getOrigin();
  const roleLabel =
    employee.clientOrg.onboardingCountersignerRole === "FOUNDER_OR_CLIENT_ADMIN"
      ? `the client's Founder/admin (${employee.clientOrg.name}) -- they don't have direct access to sign, so countersign on their behalf`
      : "HR (Masy Ops)";

  await sendOpsNotification(
    `Countersignature needed: ${employee.name}`,
    `${employee.name} (${employee.clientOrg.name}) has signed their Employment Agreement and Handbook.\n\n` +
      `Configured countersigner: ${roleLabel}.\n\n` +
      `Countersign here: ${origin}/ops/onboarding`,
  );
}

// Fires when HR marks onboarding complete -- lets the client's Founder/admin users know their
// new hire is ready to start, and separately flags Ops if any company assets still need
// management approval (there's no client-facing approval action in this version -- Ops acts on
// the client's behalf from the same queue the countersignature uses).
export async function notifyOnboardingComplete(employeeId: string): Promise<void> {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: {
      name: true,
      clientOrgId: true,
      clientOrg: { select: { name: true } },
      companyAssets: { where: { itemType: { not: "NO_EQUIPMENT_ISSUED" } } },
    },
  });
  if (!employee) return;

  const origin = await getOrigin();
  const clientUsers = await db.user.findMany({ where: { clientOrgId: employee.clientOrgId, role: "CLIENT" }, select: { email: true } });
  if (clientUsers.length > 0) {
    await sendNotification(
      clientUsers.map((u) => u.email),
      `${employee.name} has completed onboarding`,
      `${employee.name} has finished and been verified through every onboarding step and is ready to start.\n\n` +
        `View their record: ${origin}/client/staff`,
    );
  }

  const unapproved = employee.companyAssets.filter((a) => !a.managementApprovedAt);
  if (unapproved.length > 0) {
    await sendOpsNotification(
      `Equipment release still needs approval: ${employee.name}`,
      `${employee.name} (${employee.clientOrg.name}) has completed onboarding, but ${unapproved.length} company ` +
        `asset(s) still need management approval before release.\n\nReview here: ${origin}/ops/employees`,
    );
  }
}
