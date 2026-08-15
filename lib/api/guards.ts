import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSession, getSessionLearnerId } from "@/lib/auth/dal";
import { getLearnerOrNull, type LearnerProfile } from "@/lib/learners/learner";
import type { Session } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { serverErrorResponse } from "./error-response";

type Client = SupabaseClient<Database>;

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

export interface LearnerContext {
  learnerId: string;
  learner: LearnerProfile;
  supabase: Client;
}

/**
 * Shared by requireLearnerContext/requireLearnerOwnsContext below. Uses
 * getLearnerOrNull rather than getLearner deliberately: a session cookie can
 * outlive its learner row (e.g. a DB reset), and this runs before a route's
 * own body validation -- a throw here would surface as an unhandled 500
 * instead of the clean 401 a stale-but-signed session should produce.
 */
async function buildLearnerContext(
  learnerId: string
): Promise<LearnerContext | NextResponse> {
  const supabase = createServiceRoleClient();
  const learner = await getLearnerOrNull(supabase, learnerId);
  if (!learner) return unauthorized();
  return { learnerId, learner, supabase };
}

/**
 * The common "resolve the session learner, then load their learner row" shape
 * nearly every route needs. Callers do:
 *   const ctx = await requireLearnerContext();
 *   if (ctx instanceof NextResponse) return ctx;
 *   const { learnerId, learner, supabase } = ctx;
 */
export async function requireLearnerContext(): Promise<LearnerContext | NextResponse> {
  const learnerId = await requireLearnerId();
  if (learnerId instanceof NextResponse) return learnerId;
  return buildLearnerContext(learnerId);
}

/**
 * Same as requireLearnerContext, but for routes keyed off a path-param
 * learner id (e.g. /api/learners/[id]/...) rather than the session learner.
 */
export async function requireLearnerOwnsContext(
  resourceLearnerId: string
): Promise<LearnerContext | NextResponse> {
  const learnerId = await requireLearnerOwns(resourceLearnerId);
  if (learnerId instanceof NextResponse) return learnerId;
  return buildLearnerContext(learnerId);
}

export interface TutorContext {
  session: Session;
  supabase: Client;
}

/**
 * Resolves a tutor-role session, or a ready 401/403 response. Mirrors
 * requireLearnerContext's shape but for Route Handlers under a tutor role --
 * requireRole() (lib/auth/require-role.ts) is page-only (it redirect()s),
 * which isn't the right response for an API route. Tutor access is
 * tenant-wide, not scoped to a single owned resource like a learner's own
 * data, so there's no ownership check here beyond the role itself -- routes
 * that touch a specific learner still verify that learner's tenant matches.
 */
export async function requireTutorContext(): Promise<TutorContext | NextResponse> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.role !== "tutor") return forbidden();
  return { session, supabase: createServiceRoleClient() };
}

/**
 * Verifies a session belongs to the given learner: a ready 500 on a genuine
 * query error, 403 on an actual ownership mismatch (including "no such
 * session"), or null when the session is owned by the learner.
 */
export async function requireSessionOwner(
  supabase: Client,
  sessionId: string,
  learnerId: string
): Promise<NextResponse | null> {
  const { data: session, error } = await supabase
    .from("sessions")
    .select("learner_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) return serverErrorResponse(error);
  if (!session || session.learner_id !== learnerId) return forbidden();
  return null;
}
