import { db } from "@/lib/db";
import { todayDateOnly } from "@/lib/attendance";

const LEAVE_PENDING_HOURS_THRESHOLD = 24;
const REVIEW_OVERDUE_DAYS = 30;

export type NudgesDigest = { subject: string; body: string } | null;

// A once-daily rollup of things sitting unactioned, so Ops doesn't have to remember to go
// looking for them. Nothing here is a decision -- it's purely "here's what's waiting."
export async function buildNudgesDigest(): Promise<NudgesDigest> {
  const now = new Date();
  const todayStart = todayDateOnly();
  const leavePendingSince = new Date(now.getTime() - LEAVE_PENDING_HOURS_THRESHOLD * 60 * 60 * 1000);
  const reviewOverdueSince = new Date(now.getTime() - REVIEW_OVERDUE_DAYS * 24 * 60 * 60 * 1000);

  const [activeEmployees, todaysAttendance, pendingLeave, reviewedRecently] = await Promise.all([
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, clientOrg: { select: { name: true } } },
    }),
    db.attendanceRecord.findMany({ where: { date: todayStart }, select: { employeeId: true } }),
    db.leaveRequest.findMany({
      where: { status: "PENDING", createdAt: { lte: leavePendingSince } },
      include: { employee: { select: { name: true, clientOrg: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    db.performanceReview.findMany({
      // An unsent DRAFT must never count as "reviewed recently" -- that would silently
      // suppress the overdue nudge for someone who hasn't actually submitted anything.
      where: { createdAt: { gte: reviewOverdueSince }, status: { not: "DRAFT" } },
      select: { employeeId: true },
      distinct: ["employeeId"],
    }),
  ]);

  const clockedInToday = new Set(todaysAttendance.map((r) => r.employeeId));
  const reviewedRecentlyIds = new Set(reviewedRecently.map((r) => r.employeeId));

  const missingClockIns = activeEmployees.filter((e) => !clockedInToday.has(e.id));
  const overdueReviews = activeEmployees.filter((e) => !reviewedRecentlyIds.has(e.id));

  if (missingClockIns.length === 0 && pendingLeave.length === 0 && overdueReviews.length === 0) {
    return null;
  }

  const sections: string[] = [];

  if (missingClockIns.length > 0) {
    sections.push(
      `MISSING CLOCK-INS TODAY (${missingClockIns.length})\n` +
        missingClockIns.map((e) => `- ${e.name} (${e.clientOrg.name})`).join("\n"),
    );
  }

  if (pendingLeave.length > 0) {
    sections.push(
      `LEAVE AWAITING APPROVAL, ${LEAVE_PENDING_HOURS_THRESHOLD}h+ (${pendingLeave.length})\n` +
        pendingLeave
          .map((r) => `- ${r.employee.name} (${r.employee.clientOrg.name}), requested ${r.createdAt.toLocaleDateString()}`)
          .join("\n"),
    );
  }

  if (overdueReviews.length > 0) {
    sections.push(
      `NO REVIEW SUBMITTED IN ${REVIEW_OVERDUE_DAYS}+ DAYS (${overdueReviews.length})\n` +
        overdueReviews.map((e) => `- ${e.name} (${e.clientOrg.name})`).join("\n"),
    );
  }

  return {
    subject: `Daily nudges: ${missingClockIns.length} clock-in, ${pendingLeave.length} leave, ${overdueReviews.length} review`,
    body: sections.join("\n\n"),
  };
}
