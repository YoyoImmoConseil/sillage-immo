export type Database = {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          created_at: string;
          full_name: string;
          email: string;
          phone: string | null;
          message: string | null;
          source: string | null;
          status: string;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          full_name: string;
          email: string;
          phone?: string | null;
          message?: string | null;
          source?: string | null;
          status?: string;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          message?: string | null;
          source?: string | null;
          status?: string;
          metadata?: Record<string, unknown>;
        };
      };
      audit_log: {
        Row: {
          id: string;
          created_at: string;
          actor_type: string;
          actor_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          data: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          actor_type: string;
          actor_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          data?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          actor_type?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          data?: Record<string, unknown>;
        };
      };
      tool_versions: {
        Row: {
          id: string;
          created_at: string;
          tool_name: string;
          tool_version: string;
          lifecycle_status: "draft" | "active" | "deprecated";
          activated_at: string | null;
          deprecated_at: string | null;
          description: string | null;
          changelog: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          tool_name: string;
          tool_version: string;
          lifecycle_status?: "draft" | "active" | "deprecated";
          activated_at?: string | null;
          deprecated_at?: string | null;
          description?: string | null;
          changelog?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          tool_name?: string;
          tool_version?: string;
          lifecycle_status?: "draft" | "active" | "deprecated";
          activated_at?: string | null;
          deprecated_at?: string | null;
          description?: string | null;
          changelog?: Record<string, unknown>;
        };
      };
      zone_catalog: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          slug: string;
          city: string;
          score: number;
          aliases: string[];
          is_active: boolean;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          slug: string;
          city: string;
          score: number;
          aliases?: string[];
          is_active?: boolean;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          slug?: string;
          city?: string;
          score?: number;
          aliases?: string[];
          is_active?: boolean;
          metadata?: Record<string, unknown>;
        };
      };
      seller_leads: {
        Row: {
          id: string;
          created_at: string;
          full_name: string;
          email: string;
          phone: string | null;
          property_type: string | null;
          property_address: string | null;
          city: string | null;
          postal_code: string | null;
          timeline: string | null;
          occupancy_status: string | null;
          estimated_price: number | null;
          diagnostics_ready: boolean | null;
          diagnostics_support_needed: boolean | null;
          syndic_docs_ready: boolean | null;
          syndic_support_needed: boolean | null;
          message: string | null;
          source: string | null;
          status: string;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          full_name: string;
          email: string;
          phone?: string | null;
          property_type?: string | null;
          property_address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          timeline?: string | null;
          occupancy_status?: string | null;
          estimated_price?: number | null;
          diagnostics_ready?: boolean | null;
          diagnostics_support_needed?: boolean | null;
          syndic_docs_ready?: boolean | null;
          syndic_support_needed?: boolean | null;
          message?: string | null;
          source?: string | null;
          status?: string;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          property_type?: string | null;
          property_address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          timeline?: string | null;
          occupancy_status?: string | null;
          estimated_price?: number | null;
          diagnostics_ready?: boolean | null;
          diagnostics_support_needed?: boolean | null;
          syndic_docs_ready?: boolean | null;
          syndic_support_needed?: boolean | null;
          message?: string | null;
          source?: string | null;
          status?: string;
          metadata?: Record<string, unknown>;
        };
      };
      seller_scoring_events: {
        Row: {
          id: string;
          created_at: string;
          seller_lead_id: string;
          score: number;
          segment: string;
          next_best_action: string;
          breakdown: Record<string, unknown>;
          reasons: string[];
        };
        Insert: {
          id?: string;
          created_at?: string;
          seller_lead_id: string;
          score: number;
          segment: string;
          next_best_action: string;
          breakdown?: Record<string, unknown>;
          reasons?: string[];
        };
        Update: {
          id?: string;
          created_at?: string;
          seller_lead_id?: string;
          score?: number;
          segment?: string;
          next_best_action?: string;
          breakdown?: Record<string, unknown>;
          reasons?: string[];
        };
      };
      seller_email_verifications: {
        Row: {
          id: string;
          created_at: string;
          email: string;
          code_hash: string;
          verification_token: string;
          expires_at: string;
          verified_at: string | null;
          consumed_at: string | null;
          attempts: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          email: string;
          code_hash: string;
          verification_token: string;
          expires_at: string;
          verified_at?: string | null;
          consumed_at?: string | null;
          attempts?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          email?: string;
          code_hash?: string;
          verification_token?: string;
          expires_at?: string;
          verified_at?: string | null;
          consumed_at?: string | null;
          attempts?: number;
        };
      };
      domain_events: {
        Row: {
          id: string;
          created_at: string;
          occurred_at: string;
          aggregate_type: string;
          aggregate_id: string;
          event_name: string;
          event_version: number;
          payload: Record<string, unknown>;
          status: "pending" | "processed" | "failed";
          attempts: number;
          last_error: string | null;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          occurred_at?: string;
          aggregate_type: string;
          aggregate_id: string;
          event_name: string;
          event_version?: number;
          payload?: Record<string, unknown>;
          status?: "pending" | "processed" | "failed";
          attempts?: number;
          last_error?: string | null;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          occurred_at?: string;
          aggregate_type?: string;
          aggregate_id?: string;
          event_name?: string;
          event_version?: number;
          payload?: Record<string, unknown>;
          status?: "pending" | "processed" | "failed";
          attempts?: number;
          last_error?: string | null;
          published_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
