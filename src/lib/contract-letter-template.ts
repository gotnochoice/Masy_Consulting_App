import { db } from "@/lib/db";

// Fixed id -- one row, shared across every employee's drafted letter.
const SETTINGS_ID = "contract-letter-template";

export async function getContractLetterTemplate(): Promise<{ text: string; fileName: string | null } | null> {
  const row = await db.companySettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row?.contractLetterTemplateText) return null;
  return { text: row.contractLetterTemplateText, fileName: row.contractLetterTemplateName };
}

export async function saveContractLetterTemplate(text: string, fileName: string) {
  await db.companySettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, contractLetterTemplateText: text, contractLetterTemplateName: fileName },
    update: { contractLetterTemplateText: text, contractLetterTemplateName: fileName },
  });
}

export async function removeContractLetterTemplate() {
  await db.companySettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, contractLetterTemplateText: null, contractLetterTemplateName: null },
    update: { contractLetterTemplateText: null, contractLetterTemplateName: null },
  });
}
