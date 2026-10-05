import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const role = await db.openRole.findUnique({ where: { shortCode: code }, include: { clientOrg: true } });
  if (!role) {
    return NextResponse.redirect(new URL("/careers", request.url));
  }

  return NextResponse.redirect(new URL(`/${role.clientOrg.slug}/apply/${role.slug}`, request.url));
}
