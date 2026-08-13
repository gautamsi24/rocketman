import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type UserRole = "learner" | "tutor" | "evaluator";

export interface Session {
  userId: string;
  role: UserRole;
  /** null for non-learner roles (tutor/evaluator) who have no learner profile. */
  learnerId: string | null;
}

interface SessionPayload extends Session {
  [key: string]: unknown;
}

function getEncodedSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET");
  return new TextEncoder().encode(secret);
}

async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getEncodedSecret());
}

async function decrypt(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getEncodedSecret(), {
      algorithms: ["HS256"],
    });
    // Reject old-format cookies (pre-role) so they re-authenticate cleanly.
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      userId: payload.userId,
      role: payload.role as UserRole,
      learnerId: (payload.learnerId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function createSessionCookie(session: Session): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await encrypt({ ...session });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function readSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decrypt(token);
}

export async function readSessionLearnerId(): Promise<string | null> {
  const session = await readSession();
  return session?.learnerId ?? null;
}
