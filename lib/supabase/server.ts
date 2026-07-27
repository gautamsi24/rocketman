import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role client for server-only code (Route Handlers, the seed
 * script, agents). Bypasses RLS, so every access-control check (tenant
 * scoping, learner scoping) has to happen in the query itself, not in RLS
 * -- auth is enforced per-route via getSessionLearnerId() (see lib/auth/dal,
 * design doc §11), not in the database. Never import this from a Client
 * Component.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
