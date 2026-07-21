import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  await db.auditLog.deleteMany();
  await db.user.deleteMany();
  await db.attendanceRecord.deleteMany();
  await db.leaveRequest.deleteMany();
  await db.performanceReview.deleteMany();
  await db.concern.deleteMany();
  await db.pulseCheckIn.deleteMany();
  await db.onboardingTask.deleteMany();
  await db.candidate.deleteMany();
  await db.openRole.deleteMany();
  await db.monthlyReportNote.deleteMany();
  await db.employee.deleteMany();
  await db.clientOrg.deleteMany();

  const orgs = [
    {
      name: "Lagos Bites Catering",
      employees: [
        { name: "Ada Okafor", roleTitle: "Operations Manager", email: "ada@lagosbites.example" },
        { name: "Chidi Nwosu", roleTitle: "Head Chef", email: "chidi@lagosbites.example" },
        { name: "Funmi Adeyemi", roleTitle: "Logistics Coordinator", email: "funmi@lagosbites.example" },
        { name: "Bola Salako", roleTitle: "Customer Success", email: "bola@lagosbites.example" },
        { name: "Tunde Bakare", roleTitle: "Delivery Lead", email: "tunde@lagosbites.example" },
      ],
      clientContactEmail: "founder@lagosbites.example",
    },
    {
      name: "Northstar Digital Agency",
      employees: [
        { name: "Ngozi Umeh", roleTitle: "Account Manager", email: "ngozi@northstar.example" },
        { name: "Segun Fashola", roleTitle: "Lead Designer", email: "segun@northstar.example" },
        { name: "Ifeoma Chukwu", roleTitle: "Frontend Developer", email: "ifeoma@northstar.example" },
        { name: "David Okon", roleTitle: "Copywriter", email: "david@northstar.example" },
        { name: "Grace Effiong", roleTitle: "Project Coordinator", email: "grace@northstar.example" },
      ],
      clientContactEmail: "founder@northstar.example",
    },
  ];

  const credentials: { role: string; org: string; email: string; password: string }[] = [];

  const opsPassword = "MasyOps#2026";
  const opsUser = await db.user.create({
    data: {
      email: "ops@masyconsulting.example",
      passwordHash: await hash(opsPassword),
      role: "MASY_OPS",
    },
  });
  credentials.push({ role: "MASY_OPS", org: "-", email: opsUser.email, password: opsPassword });

  const createdOrgs: { id: string; name: string }[] = [];

  for (const orgData of orgs) {
    const org = await db.clientOrg.create({
      data: { name: orgData.name, status: "active" },
    });
    createdOrgs.push(org);

    const clientPassword = "ClientView#2026";
    const clientUser = await db.user.create({
      data: {
        email: orgData.clientContactEmail,
        passwordHash: await hash(clientPassword),
        role: "CLIENT",
        clientOrgId: org.id,
      },
    });
    credentials.push({ role: "CLIENT", org: org.name, email: clientUser.email, password: clientPassword });

    let first = true;
    for (const emp of orgData.employees) {
      const employee = await db.employee.create({
        data: {
          clientOrgId: org.id,
          name: emp.name,
          roleTitle: emp.roleTitle,
          email: emp.email,
          startDate: new Date("2025-01-06"),
          status: "ACTIVE",
        },
      });

      if (first) {
        const empPassword = "Employee#2026";
        const employeeUser = await db.user.create({
          data: {
            email: emp.email,
            passwordHash: await hash(empPassword),
            role: "EMPLOYEE",
            clientOrgId: org.id,
            employeeId: employee.id,
          },
        });
        credentials.push({ role: "EMPLOYEE", org: org.name, email: employeeUser.email, password: empPassword });
        first = false;
      }
    }
  }

  const sampleRole = await db.openRole.create({
    data: {
      clientOrgId: createdOrgs[0].id,
      title: "Video Editor",
      slug: slugify("Video Editor"),
      description:
        `${createdOrgs[0].name} is hiring a part-time video editor to cut short-form content for social media. Remote-friendly, flexible hours.`,
      stage: "SOURCING",
      questions: {
        create: [
          { label: "Link to your editing reel or portfolio", type: "LINK", required: true, order: 0 },
          { label: "What editing software are you most comfortable with?", type: "SHORT_TEXT", required: true, order: 1 },
          { label: "Tell us about a project you're proud of", type: "LONG_TEXT", required: false, order: 2 },
        ],
      },
    },
    include: { questions: true },
  });

  await db.candidate.create({
    data: {
      openRoleId: sampleRole.id,
      name: "Yewande Okonkwo",
      email: "yewande.editor@example.com",
      resumeLink: "https://drive.google.com/example-portfolio",
      source: "WEBSITE",
      stage: "APPLIED",
      answers: {
        create: [
          { roleQuestionId: sampleRole.questions[0].id, value: "https://vimeo.com/example-reel" },
          { roleQuestionId: sampleRole.questions[1].id, value: "DaVinci Resolve and Premiere Pro" },
        ],
      },
    },
  });

  console.log("\nSeed complete. Demo credentials:\n");
  for (const c of credentials) {
    console.log(`  [${c.role}]${c.org !== "-" ? ` (${c.org})` : ""} ${c.email} / ${c.password}`);
  }
  console.log(`\nSample public application form: /apply/${sampleRole.slug}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
