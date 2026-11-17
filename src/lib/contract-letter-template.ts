import { db } from "@/lib/db";

export async function getContractLetterTemplate(
  clientOrgId: string,
): Promise<{ text: string; fileName: string | null } | null> {
  const org = await db.clientOrg.findUnique({
    where: { id: clientOrgId },
    select: { contractLetterTemplateText: true, contractLetterTemplateName: true },
  });
  if (!org?.contractLetterTemplateText) return null;
  return { text: org.contractLetterTemplateText, fileName: org.contractLetterTemplateName };
}

export async function saveContractLetterTemplate(clientOrgId: string, text: string, fileName: string) {
  await db.clientOrg.update({
    where: { id: clientOrgId },
    data: { contractLetterTemplateText: text, contractLetterTemplateName: fileName },
  });
}

export async function removeContractLetterTemplate(clientOrgId: string) {
  await db.clientOrg.update({
    where: { id: clientOrgId },
    data: { contractLetterTemplateText: null, contractLetterTemplateName: null },
  });
}
