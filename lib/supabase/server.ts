import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role client for server-only code (Route Handlers, the seed
 * script, agents). Bypasses RLS -- there is no learner-facing auth in v1
 * (design plan scope decision #2), so every access-control check (tenant
 * scoping, learner scoping) has to happen in the query itself, not in RLS.
 * Never import this from a Client Component.
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
