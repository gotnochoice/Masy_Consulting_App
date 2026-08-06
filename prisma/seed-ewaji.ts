// One-off, idempotent setup for "Unfolding with Ewaji" (client of Masy Consulting).
// Creates the client org and two open roles with their screening questions,
// replacing the Google Form that was previously used to collect applications.
//
// Run once against the target database:
//   DATABASE_URL="<production connection string>" npx tsx prisma/seed-ewaji.ts
//
// Safe to re-run: it looks up existing records by name/slug/label before
// creating anything, so it will not create duplicates.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

type QuestionSeed = { label: string; type: "SHORT_TEXT" | "LONG_TEXT" | "LINK"; required: boolean };

const BSP_QUESTIONS: QuestionSeed[] = [
  { label: "Location (City, Country)", type: "SHORT_TEXT", required: true },
  { label: "When can you start?", type: "SHORT_TEXT", required: true },
  { label: "Are you available to work full-time, remote, on Africa-friendly working hours?", type: "SHORT_TEXT", required: true },
  { label: "What tools have you used for scheduling, email management, or CRM tracking?", type: "SHORT_TEXT", required: true },
  { label: "Describe your process for researching and identifying a high-value podcast guest.", type: "LONG_TEXT", required: true },
  { label: "This role requires close, regular communication with your boss across a time difference. Describe how you'd manage that.", type: "LONG_TEXT", required: true },
  { label: "Write a short sample outreach message to a potential podcast guest.", type: "LONG_TEXT", required: true },
  { label: "Have you managed a content calendar before? Describe your experience.", type: "LONG_TEXT", required: true },
  { label: "Give an example of a content idea you'd pitch for this brand.", type: "LONG_TEXT", required: true },
  { label: "How would you handle two urgent requests arriving at the same time?", type: "LONG_TEXT", required: true },
  { label: "Describe a time you managed multiple deadlines or projects at once.", type: "LONG_TEXT", required: true },
  { label: "Write a short sample email replying to a client asking about pricing.", type: "LONG_TEXT", required: true },
  { label: "This role is often the first point of contact for the brand. How do you handle that responsibility?", type: "LONG_TEXT", required: true },
  { label: "How do you usually communicate when you're overwhelmed?", type: "LONG_TEXT", required: true },
  { label: "Describe your ideal way of receiving feedback on your work.", type: "LONG_TEXT", required: true },
];

const VED_QUESTIONS: QuestionSeed[] = [
  { label: "Location (City, Country)", type: "SHORT_TEXT", required: true },
  { label: "When can you start?", type: "SHORT_TEXT", required: true },
  { label: "Are you available to work full-time, remote, on Africa-friendly working hours?", type: "SHORT_TEXT", required: true },
  { label: "Link to 2-3 pieces of your best work (short-form video and graphic design)", type: "LINK", required: true },
  { label: "What software do you use for video editing and graphic design?", type: "SHORT_TEXT", required: true },
  { label: "How long does it typically take you to turn around a short-form video edit?", type: "SHORT_TEXT", required: true },
  { label: "Describe your process for adding captions, text overlays, or visual effects to a video.", type: "LONG_TEXT", required: true },
  { label: "Have you designed for more than one brand or account at once? Describe your experience.", type: "LONG_TEXT", required: true },
  { label: "Tell us about a time you received feedback that required you to redo a piece of work.", type: "LONG_TEXT", required: true },
  { label: "How do you stay creative and consistent when producing content on a regular schedule?", type: "LONG_TEXT", required: true },
  { label: "Describe a time you had to interpret vague creative direction.", type: "LONG_TEXT", required: true },
  { label: "What does a strong, consistent brand identity mean to you?", type: "LONG_TEXT", required: true },
  { label: "Is there anything else you'd like us to know about you or your work?", type: "LONG_TEXT", required: false },
];

const ROLES: { title: string; description: string; questions: QuestionSeed[] }[] = [
  {
    title: "Brand Strategist & Personal Assistant",
    description:
      "Support the founder with scheduling, inbox management, and podcast guest outreach, while helping shape and " +
      "execute the brand's content calendar. You'll be the first point of contact for the brand and need to work " +
      "well across a time difference.",
    questions: BSP_QUESTIONS,
  },
  {
    title: "Video Editor & Graphic Designer",
    description:
      "Turn raw footage and briefs into polished short-form video and on-brand graphics on a regular publishing " +
      "schedule, working across more than one brand/account.",
    questions: VED_QUESTIONS,
  },
];

async function ensureOrg(name: string) {
  const existing = await db.clientOrg.findFirst({ where: { name } });
  if (existing) return existing;
  return db.clientOrg.create({ data: { name } });
}

async function ensureRole(clientOrgId: string, title: string, description: string) {
  const slug = slugify(title);
  const existing = await db.openRole.findUnique({ where: { slug } });
  if (existing) return existing;
  return db.openRole.create({
    data: { clientOrgId, title, slug, description, acceptingApplications: true },
  });
}

async function ensureQuestions(openRoleId: string, questions: QuestionSeed[]) {
  const existing = await db.roleQuestion.findMany({ where: { openRoleId } });
  const existingLabels = new Set(existing.map((q) => q.label));
  let order = existing.length;
  for (const q of questions) {
    if (existingLabels.has(q.label)) continue;
    await db.roleQuestion.create({
      data: { openRoleId, label: q.label, type: q.type, required: q.required, order: order++ },
    });
  }
}

async function main() {
  const org = await ensureOrg("Unfolding with Ewaji");
  console.log(`Client org: ${org.name} (${org.id})`);

  for (const role of ROLES) {
    const openRole = await ensureRole(org.id, role.title, role.description);
    await ensureQuestions(openRole.id, role.questions);
    console.log(`Role: ${openRole.title} -> /apply/${openRole.slug}`);
  }

  console.log("\nDone. Share the /apply/<slug> links above in place of the Google Form.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
