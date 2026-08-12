import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("MASY_OPS");
  const { id } = await params;

  const role = await db.openRole.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      candidates: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          yearsExperience: true,
          location: true,
          resumeLink: true,
          resumeFileUrl: true,
          expectedPay: true,
          howHeard: true,
          source: true,
          stage: true,
          createdAt: true,
          answers: true,
        },
      },
    },
  });

  if (!role) {
    return new NextResponse("Not found", { status: 404 });
  }

  const headers = [
    "Name",
    "Email",
    "Phone",
    "Years of experience",
    "Location",
    "Resume link",
    "Expected pay",
    "How they heard about it",
    "Source",
    "Stage",
    "Applied at",
    ...role.questions.map((q) => q.label),
  ];

  const rows = role.candidates.map((c) => {
    const answerByQuestionId = new Map(c.answers.map((a) => [a.roleQuestionId, a.value]));
    const resumeUrl = c.resumeFileUrl ?? c.resumeLink ?? "";
    return [
      c.name,
      c.email ?? "",
      c.phone ?? "",
      c.yearsExperience ?? "",
      c.location ?? "",
      resumeUrl,
      c.expectedPay ?? "",
      c.howHeard ?? "",
      c.source === "WEBSITE" ? "Applied online" : "Added by Masy",
      c.stage,
      c.createdAt.toISOString(),
      ...role.questions.map((q) => answerByQuestionId.get(q.id) ?? ""),
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => csvEscape(String(v))).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${role.slug}-candidates.csv"`,
    },
  });
}
