import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function LegacyApplyRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const role = await db.openRole.findFirst({
    where: { slug },
    include: { clientOrg: true },
  });

  if (!role) notFound();

  redirect(`/${role.clientOrg.slug}/apply/${role.slug}`);
}
