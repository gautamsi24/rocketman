import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./dal";
import type { Session, UserRole } from "./session";

// Where each role belongs, so a role that lands on the wrong page is sent home
// rather than bounced back and forth. evaluator has no UI yet -> login.
const HOME_BY_ROLE: Record<UserRole, string> = {
  learner: "/journey",
  tutor: "/tutor",
  evaluator: "/login",
};

/**
 * Server guard for a role-scoped page: returns the session if it matches the
 * required role, otherwise redirects (to /login when unauthenticated, or to the
 * session role's own home when it's a different role).
 */
export async function requireRole(role: UserRole): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== role) redirect(HOME_BY_ROLE[session.role] ?? "/login");
  return session;
}
