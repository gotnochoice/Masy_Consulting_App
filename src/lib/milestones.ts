export type Milestone = {
  employeeId: string;
  employeeName: string;
  orgName: string;
  type: "birthday" | "anniversary";
  date: Date;
  daysAway: number;
  years?: number;
};

type MilestoneEmployee = {
  id: string;
  name: string;
  clientOrg: { name: string };
  startDate: Date;
  dateOfBirth: Date | null;
};

function nextOccurrence(month: number, day: number, from: Date): { date: Date; daysAway: number } {
  const fromMidnight = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let candidate = new Date(Date.UTC(from.getUTCFullYear(), month, day));
  if (candidate < fromMidnight) {
    candidate = new Date(Date.UTC(from.getUTCFullYear() + 1, month, day));
  }
  const daysAway = Math.round((candidate.getTime() - fromMidnight.getTime()) / 86_400_000);
  return { date: candidate, daysAway };
}

export function upcomingMilestones(employees: MilestoneEmployee[], withinDays = 30, from = new Date()): Milestone[] {
  const milestones: Milestone[] = [];

  for (const employee of employees) {
    const { date: annivDate, daysAway: annivDaysAway } = nextOccurrence(
      employee.startDate.getUTCMonth(),
      employee.startDate.getUTCDate(),
      from,
    );
    if (annivDaysAway <= withinDays) {
      const years = annivDate.getUTCFullYear() - employee.startDate.getUTCFullYear();
      if (years > 0) {
        milestones.push({
          employeeId: employee.id,
          employeeName: employee.name,
          orgName: employee.clientOrg.name,
          type: "anniversary",
          date: annivDate,
          daysAway: annivDaysAway,
          years,
        });
      }
    }

    if (employee.dateOfBirth) {
      const { date: bdayDate, daysAway: bdayDaysAway } = nextOccurrence(
        employee.dateOfBirth.getUTCMonth(),
        employee.dateOfBirth.getUTCDate(),
        from,
      );
      if (bdayDaysAway <= withinDays) {
        milestones.push({
          employeeId: employee.id,
          employeeName: employee.name,
          orgName: employee.clientOrg.name,
          type: "birthday",
          date: bdayDate,
          daysAway: bdayDaysAway,
        });
      }
    }
  }

  return milestones.sort((a, b) => a.daysAway - b.daysAway);
}

export function formatMilestoneWhen(daysAway: number): string {
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  return `In ${daysAway} days`;
}
