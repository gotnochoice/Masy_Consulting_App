import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  await db.auditLog.deleteMany();
  await db.user.deleteMany();
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

  for (const orgData of orgs) {
    const org = await db.clientOrg.create({
      data: { name: orgData.name, status: "active" },
    });

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

  console.log("\nSeed complete. Demo credentials:\n");
  for (const c of credentials) {
    console.log(`  [${c.role}]${c.org !== "-" ? ` (${c.org})` : ""} ${c.email} / ${c.password}`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
