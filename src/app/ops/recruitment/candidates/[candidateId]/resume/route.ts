import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ candidateId: string }> }) {
  await requireRole("MASY_OPS");
  const { candidateId } = await params;

  const candidate = await db.candidate.findUnique({
    where: { id: candidateId },
    select: { resumeFileData: true, resumeFileType: true, resumeFileName: true },
  });

  if (!candidate?.resumeFileData) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(candidate.resumeFileData), {
    headers: {
      "Content-Type": candidate.resumeFileType ?? "application/pdf",
      "Content-Disposition": `inline; filename="${(candidate.resumeFileName ?? "resume.pdf").replace(/"/g, "")}"`,
    },
  });
}
