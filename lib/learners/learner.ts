import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface LearnerProfile {
  id: string;
  tenantId: string;
  displayName: string;
  marketId: string;
  ageBand: string;
}

export async function getLearner(
  supabase: Client,
  learnerId: string
): Promise<LearnerProfile> {
  const { data, error } = await supabase
    .from("learners")
    .select("id, tenant_id, display_name, market_id, age_band")
    .eq("id", learnerId)
    .single();
  if (error) throw error;

  return {
    id: data.id,
    tenantId: data.tenant_id,
    displayName: data.display_name,
    marketId: data.market_id,
    ageBand: data.age_band,
  };
}
