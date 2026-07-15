import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      clientOrgId: string | null;
      employeeId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    clientOrgId: string | null;
    employeeId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    clientOrgId: string | null;
    employeeId: string | null;
  }
}
