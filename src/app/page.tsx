import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  switch (session.user.role) {
    case "MASY_OPS":
      redirect("/ops/employees");
    case "CLIENT":
      redirect("/client/staff");
    case "EMPLOYEE":
      redirect("/me/profile");
  }
}
