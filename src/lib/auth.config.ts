import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/client";

/**
 * Edge-safe base config, used directly by middleware. Providers that touch
 * Postgres (via the pg driver adapter) live only in src/auth.ts, which runs
 * in the Node.js runtime — importing them here would break Edge middleware.
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.clientOrgId = user.clientOrgId;
        token.employeeId = user.employeeId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role as Role;
      session.user.clientOrgId = token.clientOrgId as string | null;
      session.user.employeeId = token.employeeId as string | null;
      return session;
    },
    authorized({ auth, request }) {
      const role = auth?.user?.role;
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/ops")) return role === "MASY_OPS";
      if (pathname.startsWith("/client")) return role === "CLIENT";
      if (pathname.startsWith("/me")) return role === "EMPLOYEE";
      return true;
    },
  },
};
