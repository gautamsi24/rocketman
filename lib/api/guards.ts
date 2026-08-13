import { NextResponse } from "next/server";
import { getSessionLearnerId } from "@/lib/auth/dal";

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * Resolves the session learner, or a ready 401 response. Callers do:
 *   const auth = await requireLearnerId();
 *   if (auth instanceof NextResponse) return auth;
 *   // auth is now the learnerId string
 */
export async function requireLearnerId(): Promise<string | NextResponse> {
  const learnerId = await getSessionLearnerId();
  return learnerId ?? unauthorized();
}

/**
 * Resolves the session learner only if it matches the resource's owner,
 * otherwise a ready 401 (unauthenticated) or 403 (mismatch) response.
 */
export async function requireLearnerOwns(
  resourceLearnerId: string
): Promise<string | NextResponse> {
  const learnerId = await getSessionLearnerId();
  if (!learnerId) return unauthorized();
  if (learnerId !== resourceLearnerId) return forbidden();
  return learnerId;
}
