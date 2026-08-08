import { db } from "@/lib/db";
import { leaveDaysBetween } from "@/lib/leave";

export type MonthlyReportData = {
  monthLabel: string;
  attendancePct: number;
  leaveDaysTaken: number;
  releasedReviews: number;
  totalReviews: number;
  concernsTotal: number;
  concernsReleased: number;
  notes: string | null;
};

export type StaffReportRow = {
  employeeId: string;
  name: string;
  roleTitle: string;
  attendancePct: number;
  leaveDaysTaken: number;
  reviewsReleased: number;
};

export function monthLabelFor(monthValue: string): string {
  const [year, monthNum] = monthValue.split("-").map(Number);
  return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString([], { year: "numeric", month: "long" });
}

export async function getMonthlyReportData(clientOrgId: string, monthValue: string): Promise<MonthlyReportData> {
  const [year, monthNum] = monthValue.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNum, 1));

  const [attendanceRecords, leaveRequests, reviews, concernsTotal, concernsReleased, note] = await Promise.all([
    db.attendanceRecord.findMany({ where: { employee: { clientOrgId }, date: { gte: monthStart, lt: monthEnd } } }),
    db.leaveRequest.findMany({
      where: { employee: { clientOrgId }, status: "APPROVED", startDate: { lt: monthEnd }, endDate: { gte: monthStart } },
    }),
    db.performanceReview.findMany({ where: { employee: { clientOrgId } } }),
    db.concern.count({ where: { employee: { clientOrgId }, createdAt: { gte: monthStart, lt: monthEnd } } }),
    db.concern.count({
      where: { employee: { clientOrgId }, createdAt: { gte: monthStart, lt: monthEnd }, visibility: "CLIENT_VISIBLE" },
    }),
    db.monthlyReportNote.findUnique({ where: { clientOrgId_month: { clientOrgId, month: monthStart } } }),
  ]);

  const completedDays = attendanceRecords.filter((r) => r.clockOut).length;
  const attendancePct = attendanceRecords.length > 0 ? Math.round((completedDays / attendanceRecords.length) * 100) : 0;
  const leaveDaysTaken = leaveRequests.reduce((sum, r) => sum + leaveDaysBetween(r.startDate, r.endDate), 0);
  const releasedReviews = reviews.filter((r) => r.status === "RELEASED").length;

  return {
    monthLabel: monthLabelFor(monthValue),
    attendancePct,
    leaveDaysTaken,
    releasedReviews,
    totalReviews: reviews.length,
    concernsTotal,
    concernsReleased,
    notes: note?.notes ?? null,
  };
}

export async function getStaffReportRows(clientOrgId: string, monthValue: string): Promise<StaffReportRow[]> {
  const [year, monthNum] = monthValue.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNum, 1));

  const employees = await db.employee.findMany({
    where: { clientOrgId },
    orderBy: { name: "asc" },
    include: {
      attendanceRecords: { where: { date: { gte: monthStart, lt: monthEnd } } },
      leaveRequests: {
        where: { status: "APPROVED", startDate: { lt: monthEnd }, endDate: { gte: monthStart } },
      },
      performanceReviews: { where: { status: "RELEASED" } },
    },
  });

  return employees.map((employee) => {
    const completedDays = employee.attendanceRecords.filter((r) => r.clockOut).length;
    const attendancePct =
      employee.attendanceRecords.length > 0
        ? Math.round((completedDays / employee.attendanceRecords.length) * 100)
        : 0;
    const leaveDaysTaken = employee.leaveRequests.reduce(
      (sum, r) => sum + leaveDaysBetween(r.startDate, r.endDate),
      0,
    );

    return {
      employeeId: employee.id,
      name: employee.name,
      roleTitle: employee.roleTitle,
      attendancePct,
      leaveDaysTaken,
      reviewsReleased: employee.performanceReviews.length,
    };
  });
}
