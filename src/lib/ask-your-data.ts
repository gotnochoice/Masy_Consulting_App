import { db } from "@/lib/db";
import { todayDateOnly } from "@/lib/attendance";

const REVIEW_OVERDUE_DAYS = 30;

export type AskQuestionKey =
  | "incomplete-attendance"
  | "reviews-due"
  | "on-leave"
  | "longest-applied"
  | "missing-bank-details";

export const ASK_QUESTIONS: { key: AskQuestionKey; label: string }[] = [
  { key: "incomplete-attendance", label: "Who has the most incomplete attendance days this month?" },
  { key: "reviews-due", label: "Which employees have a performance review due?" },
  { key: "on-leave", label: "Who's currently on approved leave?" },
  { key: "longest-applied", label: "Which candidates have been sitting in Applied longest?" },
  { key: "missing-bank-details", label: "Who's missing bank details for payroll?" },
];

export type AskResultRow = { primary: string; secondary?: string; tertiary?: string };
export type AskResult = { columns: string[]; rows: AskResultRow[] };

// Every question here is a real, fixed, pre-written query -- never an open-ended one a model
// generates on the fly. That's deliberate: it rules out a query being tricked by text stored
// in the data itself, or accidentally reaching across a permission boundary it shouldn't.
export async function runAskQuestion(key: AskQuestionKey): Promise<AskResult> {
  switch (key) {
    case "incomplete-attendance": {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const records = await db.attendanceRecord.findMany({
        where: { date: { gte: monthStart }, clockOut: null },
        include: { employee: { select: { name: true, clientOrg: { select: { name: true } } } } },
      });
      const counts = new Map<string, { name: string; org: string; count: number }>();
      for (const r of records) {
        const existing = counts.get(r.employeeId);
        if (existing) existing.count += 1;
        else counts.set(r.employeeId, { name: r.employee.name, org: r.employee.clientOrg.name, count: 1 });
      }
      const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
      return {
        columns: ["Employee", "Company", "Incomplete days this month"],
        rows: sorted.map((e) => ({ primary: e.name, secondary: e.org, tertiary: String(e.count) })),
      };
    }

    case "reviews-due": {
      const since = new Date(Date.now() - REVIEW_OVERDUE_DAYS * 24 * 60 * 60 * 1000);
      const [activeEmployees, reviewedRecently] = await Promise.all([
        db.employee.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true, clientOrg: { select: { name: true } } },
        }),
        db.performanceReview.findMany({
          where: { createdAt: { gte: since } },
          select: { employeeId: true },
          distinct: ["employeeId"],
        }),
      ]);
      const reviewedIds = new Set(reviewedRecently.map((r) => r.employeeId));
      const due = activeEmployees.filter((e) => !reviewedIds.has(e.id));
      return {
        columns: ["Employee", "Company"],
        rows: due.map((e) => ({ primary: e.name, secondary: e.clientOrg.name })),
      };
    }

    case "on-leave": {
      const today = todayDateOnly();
      const onLeave = await db.leaveRequest.findMany({
        where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
        include: { employee: { select: { name: true, clientOrg: { select: { name: true } } } } },
        orderBy: { endDate: "asc" },
      });
      return {
        columns: ["Employee", "Company", "Back on"],
        rows: onLeave.map((r) => ({
          primary: r.employee.name,
          secondary: r.employee.clientOrg.name,
          tertiary: r.endDate.toLocaleDateString([], { month: "short", day: "numeric" }),
        })),
      };
    }

    case "longest-applied": {
      const candidates = await db.candidate.findMany({
        where: { stage: "APPLIED" },
        include: { openRole: { select: { title: true, clientOrg: { select: { name: true } } } } },
        orderBy: { createdAt: "asc" },
        take: 15,
      });
      return {
        columns: ["Candidate", "Role", "Applied"],
        rows: candidates.map((c) => ({
          primary: c.name,
          secondary: `${c.openRole.title} (${c.openRole.clientOrg.name})`,
          tertiary: c.createdAt.toLocaleDateString([], { month: "short", day: "numeric" }),
        })),
      };
    }

    case "missing-bank-details": {
      const employees = await db.employee.findMany({
        where: { status: "ACTIVE", OR: [{ bankAccountNumber: null }, { bankName: null }] },
        select: { name: true, clientOrg: { select: { name: true } } },
        orderBy: { name: "asc" },
      });
      return {
        columns: ["Employee", "Company"],
        rows: employees.map((e) => ({ primary: e.name, secondary: e.clientOrg.name })),
      };
    }
  }
}
