import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/dal";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(session.role === "tutor" ? "/tutor" : "/journey");
}
