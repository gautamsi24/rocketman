type Timestamp = string;

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: { id: string; name: string; created_at: Timestamp };
        Insert: { id?: string; name: string; created_at?: Timestamp };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
        Relationships: [];
      };
      tutor_profiles: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          tone: string;
          formality: "casual" | "neutral" | "formal";
          vocabulary_level: "high-school" | "college" | "professional";
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          tone?: string;
          formality?: "casual" | "neutral" | "formal";
          vocabulary_level?: "high-school" | "college" | "professional";
          created_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["tutor_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          username: string;
          password_hash: string;
          role: "learner" | "tutor" | "evaluator";
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          username: string;
          password_hash: string;
          role?: "learner" | "tutor" | "evaluator";
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      learners: {
        Row: {
          id: string;
          tenant_id: string;
          display_name: string;
          market_id: string;
          age_band: string;
          user_id: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          display_name: string;
          market_id?: string;
          age_band?: string;
          user_id?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["learners"]["Insert"]>;
        Relationships: [];
      };
      concepts: {
        Row: {
          id: string;
          tenant_id: string;
          unit_code: string | null;
          unit_label: string | null;
          content_lo_code: string | null;
          content_lo_label: string | null;
          science_practice_code: string | null;
          science_practice_label: string | null;
          big_idea_code: string | null;
          big_idea_label: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          unit_code?: string | null;
          unit_label?: string | null;
          content_lo_code?: string | null;
          content_lo_label?: string | null;
          science_practice_code?: string | null;
          science_practice_label?: string | null;
          big_idea_code?: string | null;
          big_idea_label?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["concepts"]["Insert"]>;
        Relationships: [];
      };
      concept_prerequisites: {
        Row: {
          tenant_id: string;
          concept_id: string;
          prerequisite_concept_id: string;
        };
        Insert: {
          tenant_id: string;
          concept_id: string;
          prerequisite_concept_id: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["concept_prerequisites"]["Insert"]
        >;
        Relationships: [];
      };
      misconceptions: {
        Row: {
          id: string;
          tenant_id: string;
          code: string;
          label: string;
          description: string | null;
          scope: "content" | "practice";
          related_concept_id: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          code: string;
          label: string;
          description?: string | null;
          scope: "content" | "practice";
          related_concept_id?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["misconceptions"]["Insert"]
        >;
        Relationships: [];
      };
      bkt_concept_params: {
        Row: {
          concept_id: string;
          tenant_id: string;
          p_init: number;
          p_learn: number;
          p_guess: number;
          p_slip: number;
          source: "neutral_default" | "cb_population_data";
          updated_at: Timestamp;
        };
        Insert: {
          concept_id: string;
          tenant_id: string;
          p_init?: number;
          p_learn?: number;
          p_guess?: number;
          p_slip?: number;
          source?: "neutral_default" | "cb_population_data";
          updated_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["bkt_concept_params"]["Insert"]
        >;
        Relationships: [];
      };
      concept_mastery: {
        Row: {
          id: string;
          tenant_id: string;
          learner_id: string;
          concept_id: string;
          mastery_prob: number;
          confidence: number;
          last_practiced_at: Timestamp | null;
          attempts: number;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          learner_id: string;
          concept_id: string;
          mastery_prob?: number;
          confidence?: number;
          last_practiced_at?: Timestamp | null;
          attempts?: number;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["concept_mastery"]["Insert"]
        >;
        Relationships: [];
      };
      concept_mastery_history: {
        Row: {
          id: string;
          tenant_id: string;
          learner_id: string;
          concept_id: string;
          mastery_prob: number;
          recorded_at: Timestamp;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          learner_id: string;
          concept_id: string;
          mastery_prob: number;
          recorded_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["concept_mastery_history"]["Insert"]
        >;
        Relationships: [];
      };
      learner_misconceptions: {
        Row: {
          id: string;
          tenant_id: string;
          learner_id: string;
          misconception_id: string;
          evidence_count: number;
          last_observed_at: Timestamp;
          status: "active" | "learner_dismissed" | "resolved";
        };
        Insert: {
          id?: string;
          tenant_id: string;
          learner_id: string;
          misconception_id: string;
          evidence_count?: number;
          last_observed_at?: Timestamp;
          status?: "active" | "learner_dismissed" | "resolved";
        };
        Update: Partial<
          Database["public"]["Tables"]["learner_misconceptions"]["Insert"]
        >;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          tenant_id: string;
          learner_id: string;
          started_at: Timestamp;
          ended_at: Timestamp | null;
          status: "active" | "ended";
        };
        Insert: {
          id?: string;
          tenant_id: string;
          learner_id: string;
          started_at?: Timestamp;
          ended_at?: Timestamp | null;
          status?: "active" | "ended";
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [];
      };
      learner_insights: {
        Row: {
          id: string;
          tenant_id: string;
          learner_id: string;
          source_session_id: string | null;
          summary_text: string;
          embedding: string | null;
          retention_until: Timestamp | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          learner_id: string;
          source_session_id?: string | null;
          summary_text: string;
          embedding?: number[] | null;
          retention_until?: Timestamp | null;
          created_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["learner_insights"]["Insert"]
        >;
        Relationships: [];
      };
      turn_events: {
        Row: {
          id: string;
          tenant_id: string;
          learner_id: string;
          session_id: string;
          concept_id: string | null;
          learner_message: string;
          tutor_message: string;
          hints_used: number;
          status: "pending" | "processed" | "error";
          error_detail: string | null;
          created_at: Timestamp;
          processed_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          learner_id: string;
          session_id: string;
          concept_id?: string | null;
          learner_message: string;
          tutor_message: string;
          hints_used?: number;
          status?: "pending" | "processed" | "error";
          error_detail?: string | null;
          created_at?: Timestamp;
          processed_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["turn_events"]["Insert"]>;
        Relationships: [];
      };
      learner_assertions: {
        Row: {
          id: string;
          tenant_id: string;
          learner_id: string;
          concept_id: string;
          assertion_type: "knows_now" | "misconception_resolved";
          note: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          learner_id: string;
          concept_id: string;
          assertion_type: "knows_now" | "misconception_resolved";
          note?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["learner_assertions"]["Insert"]
        >;
        Relationships: [];
      };
      curriculum_items: {
        Row: {
          id: string;
          tenant_id: string;
          concept_id: string;
          prompt_text: string;
          teaching_content: string;
          frq_archetype: string | null;
          frq_archetype_source: "editorial_classification" | "verified" | null;
          embedding: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          concept_id: string;
          prompt_text: string;
          teaching_content: string;
          frq_archetype?: string | null;
          frq_archetype_source?: "editorial_classification" | "verified" | null;
          embedding?: number[] | null;
          created_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["curriculum_items"]["Insert"]
        >;
        Relationships: [];
      };
      concept_podcasts: {
        Row: {
          id: string;
          tenant_id: string;
          concept_id: string;
          script_text: string;
          audio_path: string;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          concept_id: string;
          script_text: string;
          audio_path: string;
          created_at?: Timestamp;
        };
        Update: Partial<
          Database["public"]["Tables"]["concept_podcasts"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_learner_insights: {
        Args: {
          query_embedding: number[];
          match_learner_id: string;
          match_count: number;
        };
        Returns: {
          id: string;
          summary_text: string;
          similarity: number;
        }[];
      };
    };
  };
}
