export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          reference: string | null;
          business_type: string;
          status: string;
          property_id: string | null;
          seller_project_id: string | null;
          buyer_project_id: string | null;
          client_project_id: string | null;
          assigned_admin_profile_id: string | null;
          currency: string;
          mandate_price_amount: number | null;
          agreed_price_amount: number | null;
          deed_price_amount: number | null;
          honoraires_amount: number | null;
          honoraires_source: string | null;
          mandate_signed_at: string | null;
          offer_received_at: string | null;
          preliminary_sale_signed_at: string | null;
          deed_signed_at: string | null;
          cancelled_at: string | null;
          source: string;
          notes: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          reference?: string | null;
          business_type?: string;
          status?: string;
          property_id?: string | null;
          seller_project_id?: string | null;
          buyer_project_id?: string | null;
          client_project_id?: string | null;
          assigned_admin_profile_id?: string | null;
          currency?: string;
          mandate_price_amount?: number | null;
          agreed_price_amount?: number | null;
          deed_price_amount?: number | null;
          honoraires_amount?: number | null;
          honoraires_source?: string | null;
          mandate_signed_at?: string | null;
          offer_received_at?: string | null;
          preliminary_sale_signed_at?: string | null;
          deed_signed_at?: string | null;
          cancelled_at?: string | null;
          source?: string;
          notes?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          reference?: string | null;
          business_type?: string;
          status?: string;
          property_id?: string | null;
          seller_project_id?: string | null;
          buyer_project_id?: string | null;
          client_project_id?: string | null;
          assigned_admin_profile_id?: string | null;
          currency?: string;
          mandate_price_amount?: number | null;
          agreed_price_amount?: number | null;
          deed_price_amount?: number | null;
          honoraires_amount?: number | null;
          honoraires_source?: string | null;
          mandate_signed_at?: string | null;
          offer_received_at?: string | null;
          preliminary_sale_signed_at?: string | null;
          deed_signed_at?: string | null;
          cancelled_at?: string | null;
          source?: string;
          notes?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_seller_project_id_fkey";
            columns: ["seller_project_id"];
            isOneToOne: false;
            referencedRelation: "seller_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_buyer_project_id_fkey";
            columns: ["buyer_project_id"];
            isOneToOne: false;
            referencedRelation: "buyer_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_assigned_admin_profile_id_fkey";
            columns: ["assigned_admin_profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      transaction_sellers: {
        Row: {
          id: string;
          created_at: string;
          transaction_id: string;
          contact_identity_id: string | null;
          seller_lead_id: string | null;
          client_profile_id: string | null;
          external_name: string | null;
          external_email: string | null;
          share_percent: number | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          transaction_id: string;
          contact_identity_id?: string | null;
          seller_lead_id?: string | null;
          client_profile_id?: string | null;
          external_name?: string | null;
          external_email?: string | null;
          share_percent?: number | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          transaction_id?: string;
          contact_identity_id?: string | null;
          seller_lead_id?: string | null;
          client_profile_id?: string | null;
          external_name?: string | null;
          external_email?: string | null;
          share_percent?: number | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_sellers_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      transaction_buyers: {
        Row: {
          id: string;
          created_at: string;
          transaction_id: string;
          contact_identity_id: string | null;
          buyer_lead_id: string | null;
          client_profile_id: string | null;
          external_name: string | null;
          external_email: string | null;
          is_external: boolean;
          share_percent: number | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          transaction_id: string;
          contact_identity_id?: string | null;
          buyer_lead_id?: string | null;
          client_profile_id?: string | null;
          external_name?: string | null;
          external_email?: string | null;
          is_external?: boolean;
          share_percent?: number | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          transaction_id?: string;
          contact_identity_id?: string | null;
          buyer_lead_id?: string | null;
          client_profile_id?: string | null;
          external_name?: string | null;
          external_email?: string | null;
          is_external?: boolean;
          share_percent?: number | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_buyers_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      honoraires_history: {
        Row: {
          id: string;
          created_at: string;
          transaction_id: string;
          amount: number;
          currency: string;
          source: string;
          reason: string | null;
          recorded_by_admin_profile_id: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          transaction_id: string;
          amount: number;
          currency?: string;
          source?: string;
          reason?: string | null;
          recorded_by_admin_profile_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          transaction_id?: string;
          amount?: number;
          currency?: string;
          source?: string;
          reason?: string | null;
          recorded_by_admin_profile_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "honoraires_history_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      market_observations: {
        Row: {
          id: string;
          created_at: string;
          observed_at: string;
          source: string;
          valuation_id: string | null;
          property_id: string | null;
          city: string | null;
          postal_code: string | null;
          zone_slug: string | null;
          neighborhood: string | null;
          property_type: string | null;
          business_type: string;
          price_per_m2: number | null;
          price_per_m2_low: number | null;
          price_per_m2_high: number | null;
          estimated_price: number | null;
          living_area_m2: number | null;
          currency: string;
          raw_payload: Record<string, unknown>;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          observed_at?: string;
          source?: string;
          valuation_id?: string | null;
          property_id?: string | null;
          city?: string | null;
          postal_code?: string | null;
          zone_slug?: string | null;
          neighborhood?: string | null;
          property_type?: string | null;
          business_type?: string;
          price_per_m2?: number | null;
          price_per_m2_low?: number | null;
          price_per_m2_high?: number | null;
          estimated_price?: number | null;
          living_area_m2?: number | null;
          currency?: string;
          raw_payload?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          observed_at?: string;
          source?: string;
          valuation_id?: string | null;
          property_id?: string | null;
          city?: string | null;
          postal_code?: string | null;
          zone_slug?: string | null;
          neighborhood?: string | null;
          property_type?: string | null;
          business_type?: string;
          price_per_m2?: number | null;
          price_per_m2_low?: number | null;
          price_per_m2_high?: number | null;
          estimated_price?: number | null;
          living_area_m2?: number | null;
          currency?: string;
          raw_payload?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "market_observations_valuation_id_fkey";
            columns: ["valuation_id"];
            isOneToOne: false;
            referencedRelation: "valuations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "market_observations_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
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
        Relationships: [];
      };
      rate_limit_counters: {
        Row: {
          key: string;
          count: number;
          window_expires_at: string;
        };
        Insert: {
          key: string;
          count?: number;
          window_expires_at: string;
        };
        Update: {
          key?: string;
          count?: number;
          window_expires_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      seller_leads: {
        Row: {
          id: string;
          created_at: string;
          full_name: string;
          email: string;
          phone: string | null;
          contact_identity_id: string | null;
          assigned_admin_profile_id: string | null;
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
          contact_identity_id?: string | null;
          assigned_admin_profile_id?: string | null;
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
          contact_identity_id?: string | null;
          assigned_admin_profile_id?: string | null;
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
        Relationships: [
          {
            foreignKeyName: "seller_leads_contact_identity_id_fkey";
            columns: ["contact_identity_id"];
            isOneToOne: false;
            referencedRelation: "contact_identities";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "seller_scoring_events_seller_lead_id_fkey";
            columns: ["seller_lead_id"];
            isOneToOne: false;
            referencedRelation: "seller_leads";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [];
      };
      contact_identities: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string | null;
          normalized_email: string | null;
          phone: string | null;
          normalized_phone: string | null;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          normalized_email?: string | null;
          phone?: string | null;
          normalized_phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          normalized_email?: string | null;
          phone?: string | null;
          normalized_phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
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
        Relationships: [];
      };
      api_idempotency_keys: {
        Row: {
          id: string;
          created_at: string;
          scope: string;
          key_hash: string;
          status_code: number | null;
          response_payload: Record<string, unknown> | null;
          expires_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          scope: string;
          key_hash: string;
          status_code?: number | null;
          response_payload?: Record<string, unknown> | null;
          expires_at: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          scope?: string;
          key_hash?: string;
          status_code?: number | null;
          response_payload?: Record<string, unknown> | null;
          expires_at?: string;
        };
        Relationships: [];
      };
      crm_webhook_deliveries: {
        Row: {
          id: string;
          created_at: string;
          provider: string;
          event_name: string;
          event_key: string;
          estate_id: string | null;
          company_id: string | null;
          payload: Record<string, unknown>;
          signature: string | null;
          status: "received" | "processing" | "processed" | "failed" | "ignored";
          attempts: number;
          last_error: string | null;
          processed_at: string | null;
          response_status: number | null;
          response_payload: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          provider: string;
          event_name: string;
          event_key: string;
          estate_id?: string | null;
          company_id?: string | null;
          payload?: Record<string, unknown>;
          signature?: string | null;
          status?: "received" | "processing" | "processed" | "failed" | "ignored";
          attempts?: number;
          last_error?: string | null;
          processed_at?: string | null;
          response_status?: number | null;
          response_payload?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          provider?: string;
          event_name?: string;
          event_key?: string;
          estate_id?: string | null;
          company_id?: string | null;
          payload?: Record<string, unknown>;
          signature?: string | null;
          status?: "received" | "processing" | "processed" | "failed" | "ignored";
          attempts?: number;
          last_error?: string | null;
          processed_at?: string | null;
          response_status?: number | null;
          response_payload?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          last_synced_at: string;
          source: string;
          source_ref: string;
          company_id: string | null;
          project_id: string | null;
          is_project: boolean;
          kind: "sale" | "rental" | "project" | "unit";
          negotiation: string | null;
          title: string | null;
          description: string | null;
          property_type: string | null;
          sub_type: string | null;
          availability_status: string | null;
          general_condition: string | null;
          street: string | null;
          street_number: string | null;
          postal_code: string | null;
          city: string | null;
          country: string | null;
          formatted_address: string | null;
          latitude: number | null;
          longitude: number | null;
          living_area: number | null;
          plot_area: number | null;
          bedrooms: number | null;
          bathrooms: number | null;
          rooms: number | null;
          floor: number | null;
          has_terrace: boolean | null;
          has_elevator: boolean | null;
          virtual_tour_url: string | null;
          video_url: string | null;
          appointment_service_url: string | null;
          negotiator: Record<string, unknown>;
          legal: Record<string, unknown>;
          raw_payload: Record<string, unknown>;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          last_synced_at?: string;
          source: string;
          source_ref: string;
          company_id?: string | null;
          project_id?: string | null;
          is_project?: boolean;
          kind?: "sale" | "rental" | "project" | "unit";
          negotiation?: string | null;
          title?: string | null;
          description?: string | null;
          property_type?: string | null;
          sub_type?: string | null;
          availability_status?: string | null;
          general_condition?: string | null;
          street?: string | null;
          street_number?: string | null;
          postal_code?: string | null;
          city?: string | null;
          country?: string | null;
          formatted_address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          living_area?: number | null;
          plot_area?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          rooms?: number | null;
          floor?: number | null;
          has_terrace?: boolean | null;
          has_elevator?: boolean | null;
          virtual_tour_url?: string | null;
          video_url?: string | null;
          appointment_service_url?: string | null;
          negotiator?: Record<string, unknown>;
          legal?: Record<string, unknown>;
          raw_payload?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          last_synced_at?: string;
          source?: string;
          source_ref?: string;
          company_id?: string | null;
          project_id?: string | null;
          is_project?: boolean;
          kind?: "sale" | "rental" | "project" | "unit";
          negotiation?: string | null;
          title?: string | null;
          description?: string | null;
          property_type?: string | null;
          sub_type?: string | null;
          availability_status?: string | null;
          general_condition?: string | null;
          street?: string | null;
          street_number?: string | null;
          postal_code?: string | null;
          city?: string | null;
          country?: string | null;
          formatted_address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          living_area?: number | null;
          plot_area?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          rooms?: number | null;
          floor?: number | null;
          has_terrace?: boolean | null;
          has_elevator?: boolean | null;
          virtual_tour_url?: string | null;
          video_url?: string | null;
          appointment_service_url?: string | null;
          negotiator?: Record<string, unknown>;
          legal?: Record<string, unknown>;
          raw_payload?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      property_listings: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          property_id: string;
          business_type: "sale" | "rental";
          publication_status: "active" | "inactive" | "deleted";
          is_published: boolean;
          slug: string;
          canonical_path: string;
          title: string | null;
          city: string | null;
          postal_code: string | null;
          property_type: string | null;
          cover_image_url: string | null;
          rooms: number | null;
          bedrooms: number | null;
          living_area: number | null;
          floor: number | null;
          has_terrace: boolean | null;
          has_elevator: boolean | null;
          price_amount: number | null;
          price_currency: string;
          published_at: string | null;
          unpublished_at: string | null;
          listing_metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          property_id: string;
          business_type: "sale" | "rental";
          publication_status?: "active" | "inactive" | "deleted";
          is_published?: boolean;
          slug: string;
          canonical_path: string;
          title?: string | null;
          city?: string | null;
          postal_code?: string | null;
          property_type?: string | null;
          cover_image_url?: string | null;
          rooms?: number | null;
          bedrooms?: number | null;
          living_area?: number | null;
          floor?: number | null;
          has_terrace?: boolean | null;
          has_elevator?: boolean | null;
          price_amount?: number | null;
          price_currency?: string;
          published_at?: string | null;
          unpublished_at?: string | null;
          listing_metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          property_id?: string;
          business_type?: "sale" | "rental";
          publication_status?: "active" | "inactive" | "deleted";
          is_published?: boolean;
          slug?: string;
          canonical_path?: string;
          title?: string | null;
          city?: string | null;
          postal_code?: string | null;
          property_type?: string | null;
          cover_image_url?: string | null;
          rooms?: number | null;
          bedrooms?: number | null;
          living_area?: number | null;
          floor?: number | null;
          has_terrace?: boolean | null;
          has_elevator?: boolean | null;
          price_amount?: number | null;
          price_currency?: string;
          published_at?: string | null;
          unpublished_at?: string | null;
          listing_metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "property_listings_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      property_media: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          property_id: string;
          remote_media_id: string;
          kind: "image" | "plan" | "document" | "video";
          ordinal: number;
          title: string | null;
          description: string | null;
          content_type: string | null;
          remote_url: string | null;
          cached_url: string | null;
          expires_at: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          property_id: string;
          remote_media_id: string;
          kind: "image" | "plan" | "document" | "video";
          ordinal?: number;
          title?: string | null;
          description?: string | null;
          content_type?: string | null;
          remote_url?: string | null;
          cached_url?: string | null;
          expires_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          property_id?: string;
          remote_media_id?: string;
          kind?: "image" | "plan" | "document" | "video";
          ordinal?: number;
          title?: string | null;
          description?: string | null;
          content_type?: string | null;
          remote_url?: string | null;
          cached_url?: string | null;
          expires_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "property_media_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      admin_profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          auth_user_id: string | null;
          email: string;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
          is_active: boolean;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          auth_user_id?: string | null;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string | null;
          is_active?: boolean;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          auth_user_id?: string | null;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string | null;
          is_active?: boolean;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      admin_role_assignments: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          admin_profile_id: string;
          role: string;
          granted_by_profile_id: string | null;
          is_active: boolean;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          admin_profile_id: string;
          role: string;
          granted_by_profile_id?: string | null;
          is_active?: boolean;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          admin_profile_id?: string;
          role?: string;
          granted_by_profile_id?: string | null;
          is_active?: boolean;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "admin_role_assignments_admin_profile_id_fkey";
            columns: ["admin_profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_role_assignments_granted_by_profile_id_fkey";
            columns: ["granted_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      buyer_leads: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          full_name: string;
          email: string;
          phone: string | null;
          contact_identity_id: string | null;
          source: string | null;
          status: string;
          timeline: string | null;
          financing_status: string | null;
          preferred_contact_channel: string | null;
          notes: string | null;
          assigned_admin_profile_id: string | null;
          metadata: Record<string, unknown>;
          sweepbright_contact_id: string | null;
          sweepbright_synced_at: string | null;
          sweepbright_last_error: string | null;
          email_verified_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          full_name: string;
          email: string;
          phone?: string | null;
          contact_identity_id?: string | null;
          source?: string | null;
          status?: string;
          timeline?: string | null;
          financing_status?: string | null;
          preferred_contact_channel?: string | null;
          notes?: string | null;
          assigned_admin_profile_id?: string | null;
          metadata?: Record<string, unknown>;
          sweepbright_contact_id?: string | null;
          sweepbright_synced_at?: string | null;
          sweepbright_last_error?: string | null;
          email_verified_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          contact_identity_id?: string | null;
          source?: string | null;
          status?: string;
          timeline?: string | null;
          financing_status?: string | null;
          preferred_contact_channel?: string | null;
          notes?: string | null;
          assigned_admin_profile_id?: string | null;
          metadata?: Record<string, unknown>;
          sweepbright_contact_id?: string | null;
          sweepbright_synced_at?: string | null;
          sweepbright_last_error?: string | null;
          email_verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_leads_assigned_admin_profile_id_fkey";
            columns: ["assigned_admin_profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_leads_contact_identity_id_fkey";
            columns: ["contact_identity_id"];
            isOneToOne: false;
            referencedRelation: "contact_identities";
            referencedColumns: ["id"];
          }
        ];
      };
      buyer_search_profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          buyer_lead_id: string;
          client_project_id: string | null;
          business_type: string;
          status: string;
          location_text: string | null;
          cities: string[];
          property_types: string[];
          budget_min: number | null;
          budget_max: number | null;
          rooms_min: number | null;
          rooms_max: number | null;
          bedrooms_min: number | null;
          living_area_min: number | null;
          living_area_max: number | null;
          floor_min: number | null;
          floor_max: number | null;
          requires_terrace: boolean | null;
          requires_elevator: boolean | null;
          criteria: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          buyer_lead_id: string;
          client_project_id?: string | null;
          business_type?: string;
          status?: string;
          location_text?: string | null;
          cities?: string[];
          property_types?: string[];
          budget_min?: number | null;
          budget_max?: number | null;
          rooms_min?: number | null;
          rooms_max?: number | null;
          bedrooms_min?: number | null;
          living_area_min?: number | null;
          living_area_max?: number | null;
          floor_min?: number | null;
          floor_max?: number | null;
          requires_terrace?: boolean | null;
          requires_elevator?: boolean | null;
          criteria?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          buyer_lead_id?: string;
          client_project_id?: string | null;
          business_type?: string;
          status?: string;
          location_text?: string | null;
          cities?: string[];
          property_types?: string[];
          budget_min?: number | null;
          budget_max?: number | null;
          rooms_min?: number | null;
          rooms_max?: number | null;
          bedrooms_min?: number | null;
          living_area_min?: number | null;
          living_area_max?: number | null;
          floor_min?: number | null;
          floor_max?: number | null;
          requires_terrace?: boolean | null;
          requires_elevator?: boolean | null;
          criteria?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_search_profiles_buyer_lead_id_fkey";
            columns: ["buyer_lead_id"];
            isOneToOne: false;
            referencedRelation: "buyer_leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_search_profiles_client_project_id_fkey";
            columns: ["client_project_id"];
            isOneToOne: false;
            referencedRelation: "client_projects";
            referencedColumns: ["id"];
          }
        ];
      };
      buyer_property_matches: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          buyer_lead_id: string;
          buyer_search_profile_id: string;
          property_id: string;
          property_listing_id: string;
          score: number;
          status: string;
          blockers: unknown[];
          matched_criteria: Record<string, unknown>;
          notes: string | null;
          computed_at: string;
          notified_at: string | null;
          read_at: string | null;
          first_seen_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          buyer_lead_id: string;
          buyer_search_profile_id: string;
          property_id: string;
          property_listing_id: string;
          score: number;
          status?: string;
          blockers?: unknown[];
          matched_criteria?: Record<string, unknown>;
          notes?: string | null;
          computed_at?: string;
          notified_at?: string | null;
          read_at?: string | null;
          first_seen_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          buyer_lead_id?: string;
          buyer_search_profile_id?: string;
          property_id?: string;
          property_listing_id?: string;
          score?: number;
          status?: string;
          blockers?: unknown[];
          matched_criteria?: Record<string, unknown>;
          notes?: string | null;
          computed_at?: string;
          notified_at?: string | null;
          read_at?: string | null;
          first_seen_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_property_matches_buyer_lead_id_fkey";
            columns: ["buyer_lead_id"];
            isOneToOne: false;
            referencedRelation: "buyer_leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_property_matches_buyer_search_profile_id_fkey";
            columns: ["buyer_search_profile_id"];
            isOneToOne: false;
            referencedRelation: "buyer_search_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_property_matches_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_property_matches_property_listing_id_fkey";
            columns: ["property_listing_id"];
            isOneToOne: false;
            referencedRelation: "property_listings";
            referencedColumns: ["id"];
          }
        ];
      };
      client_profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          auth_user_id: string | null;
          email: string;
          phone: string | null;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
          is_active: boolean;
          contact_identity_id: string | null;
          last_login_at: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          auth_user_id?: string | null;
          email: string;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string | null;
          is_active?: boolean;
          contact_identity_id?: string | null;
          last_login_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          auth_user_id?: string | null;
          email?: string;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string | null;
          is_active?: boolean;
          contact_identity_id?: string | null;
          last_login_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "client_profiles_contact_identity_id_fkey";
            columns: ["contact_identity_id"];
            isOneToOne: false;
            referencedRelation: "contact_identities";
            referencedColumns: ["id"];
          }
        ];
      };
      client_projects: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          client_profile_id: string;
          project_type: string;
          status: string;
          title: string | null;
          created_from: string;
          primary_admin_profile_id: string | null;
          source: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_profile_id: string;
          project_type: string;
          status?: string;
          title?: string | null;
          created_from: string;
          primary_admin_profile_id?: string | null;
          source?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_profile_id?: string;
          project_type?: string;
          status?: string;
          title?: string | null;
          created_from?: string;
          primary_admin_profile_id?: string | null;
          source?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "client_projects_client_profile_id_fkey";
            columns: ["client_profile_id"];
            isOneToOne: false;
            referencedRelation: "client_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      buyer_projects: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          client_project_id: string;
          buyer_lead_id: string | null;
          active_search_profile_id: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id: string;
          buyer_lead_id?: string | null;
          active_search_profile_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id?: string;
          buyer_lead_id?: string | null;
          active_search_profile_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_projects_client_project_id_fkey";
            columns: ["client_project_id"];
            isOneToOne: true;
            referencedRelation: "client_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_projects_buyer_lead_id_fkey";
            columns: ["buyer_lead_id"];
            isOneToOne: true;
            referencedRelation: "buyer_leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_projects_active_search_profile_id_fkey";
            columns: ["active_search_profile_id"];
            isOneToOne: false;
            referencedRelation: "buyer_search_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      seller_projects: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          client_project_id: string;
          seller_lead_id: string | null;
          assigned_admin_profile_id: string | null;
          entry_channel: string;
          project_status: string;
          mandate_status: string;
          latest_valuation_id: string | null;
          metadata: Record<string, unknown>;
          mandate_signed_at: string | null;
          mynotary_operation_id: string | null;
          offer_received_at: string | null;
          offer_buyer_lead_id: string | null;
          offer_buyer_name: string | null;
          preliminary_sale_signed_at: string | null;
          deed_signed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id: string;
          seller_lead_id?: string | null;
          assigned_admin_profile_id?: string | null;
          entry_channel: string;
          project_status?: string;
          mandate_status?: string;
          latest_valuation_id?: string | null;
          metadata?: Record<string, unknown>;
          mandate_signed_at?: string | null;
          mynotary_operation_id?: string | null;
          offer_received_at?: string | null;
          offer_buyer_lead_id?: string | null;
          offer_buyer_name?: string | null;
          preliminary_sale_signed_at?: string | null;
          deed_signed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id?: string;
          seller_lead_id?: string | null;
          assigned_admin_profile_id?: string | null;
          entry_channel?: string;
          project_status?: string;
          mandate_status?: string;
          latest_valuation_id?: string | null;
          metadata?: Record<string, unknown>;
          mandate_signed_at?: string | null;
          mynotary_operation_id?: string | null;
          offer_received_at?: string | null;
          offer_buyer_lead_id?: string | null;
          offer_buyer_name?: string | null;
          preliminary_sale_signed_at?: string | null;
          deed_signed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "seller_projects_client_project_id_fkey";
            columns: ["client_project_id"];
            isOneToOne: true;
            referencedRelation: "client_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_projects_latest_valuation_id_fkey";
            columns: ["latest_valuation_id"];
            isOneToOne: false;
            referencedRelation: "valuations";
            referencedColumns: ["id"];
          }
        ];
      };
      valuations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          client_project_id: string | null;
          seller_project_id: string | null;
          seller_lead_id: string | null;
          property_id: string | null;
          contact_identity_id: string | null;
          source: string;
          source_ref: string | null;
          provider: string | null;
          valuation_kind: string;
          status: string;
          estimated_price: number | null;
          valuation_low: number | null;
          valuation_high: number | null;
          currency: string;
          valuated_at: string;
          raw_payload: Record<string, unknown>;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id?: string | null;
          seller_project_id?: string | null;
          seller_lead_id?: string | null;
          property_id?: string | null;
          contact_identity_id?: string | null;
          source: string;
          source_ref?: string | null;
          provider?: string | null;
          valuation_kind?: string;
          status?: string;
          estimated_price?: number | null;
          valuation_low?: number | null;
          valuation_high?: number | null;
          currency?: string;
          valuated_at?: string;
          raw_payload?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id?: string | null;
          seller_project_id?: string | null;
          seller_lead_id?: string | null;
          property_id?: string | null;
          contact_identity_id?: string | null;
          source?: string;
          source_ref?: string | null;
          provider?: string | null;
          valuation_kind?: string;
          status?: string;
          estimated_price?: number | null;
          valuation_low?: number | null;
          valuation_high?: number | null;
          currency?: string;
          valuated_at?: string;
          raw_payload?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "valuations_client_project_id_fkey";
            columns: ["client_project_id"];
            isOneToOne: false;
            referencedRelation: "client_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "valuations_seller_project_id_fkey";
            columns: ["seller_project_id"];
            isOneToOne: false;
            referencedRelation: "seller_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "valuations_seller_lead_id_fkey";
            columns: ["seller_lead_id"];
            isOneToOne: false;
            referencedRelation: "seller_leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "valuations_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "valuations_contact_identity_id_fkey";
            columns: ["contact_identity_id"];
            isOneToOne: false;
            referencedRelation: "contact_identities";
            referencedColumns: ["id"];
          }
        ];
      };
      project_properties: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          client_project_id: string;
          property_id: string;
          relationship_type: string;
          is_primary: boolean;
          linked_by_admin_profile_id: string | null;
          unlinked_at: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id: string;
          property_id: string;
          relationship_type?: string;
          is_primary?: boolean;
          linked_by_admin_profile_id?: string | null;
          unlinked_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id?: string;
          property_id?: string;
          relationship_type?: string;
          is_primary?: boolean;
          linked_by_admin_profile_id?: string | null;
          unlinked_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "project_properties_client_project_id_fkey";
            columns: ["client_project_id"];
            isOneToOne: false;
            referencedRelation: "client_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_properties_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      client_project_invitations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          client_project_id: string;
          client_profile_id: string;
          email: string;
          token_hash: string;
          provider_hint: string | null;
          expires_at: string;
          accepted_at: string | null;
          revoked_at: string | null;
          created_by_admin_profile_id: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id: string;
          client_profile_id: string;
          email: string;
          token_hash: string;
          provider_hint?: string | null;
          expires_at: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          created_by_admin_profile_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id?: string;
          client_profile_id?: string;
          email?: string;
          token_hash?: string;
          provider_hint?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          created_by_admin_profile_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      seller_project_advisor_history: {
        Row: {
          id: string;
          created_at: string;
          seller_project_id: string;
          admin_profile_id: string;
          assigned_at: string;
          unassigned_at: string | null;
          assigned_by_admin_profile_id: string | null;
          reason: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          seller_project_id: string;
          admin_profile_id: string;
          assigned_at?: string;
          unassigned_at?: string | null;
          assigned_by_admin_profile_id?: string | null;
          reason?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          seller_project_id?: string;
          admin_profile_id?: string;
          assigned_at?: string;
          unassigned_at?: string | null;
          assigned_by_admin_profile_id?: string | null;
          reason?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "seller_project_advisor_history_seller_project_id_fkey";
            columns: ["seller_project_id"];
            isOneToOne: false;
            referencedRelation: "seller_projects";
            referencedColumns: ["id"];
          }
        ];
      };
      client_project_events: {
        Row: {
          id: string;
          created_at: string;
          client_project_id: string;
          seller_project_id: string | null;
          event_name: string;
          event_category: string;
          visible_to_client: boolean;
          actor_type: string | null;
          actor_id: string | null;
          payload: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          client_project_id: string;
          seller_project_id?: string | null;
          event_name: string;
          event_category: string;
          visible_to_client?: boolean;
          actor_type?: string | null;
          actor_id?: string | null;
          payload?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          client_project_id?: string;
          seller_project_id?: string | null;
          event_name?: string;
          event_category?: string;
          visible_to_client?: boolean;
          actor_type?: string | null;
          actor_id?: string | null;
          payload?: Record<string, unknown>;
        };
        Relationships: [];
      };
      client_project_clients: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          client_project_id: string;
          client_profile_id: string;
          role: "primary" | "co_owner";
          added_by_admin_profile_id: string | null;
          removed_at: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id: string;
          client_profile_id: string;
          role?: "primary" | "co_owner";
          added_by_admin_profile_id?: string | null;
          removed_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id?: string;
          client_profile_id?: string;
          role?: "primary" | "co_owner";
          added_by_admin_profile_id?: string | null;
          removed_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "client_project_clients_client_project_id_fkey";
            columns: ["client_project_id"];
            isOneToOne: false;
            referencedRelation: "client_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_project_clients_client_profile_id_fkey";
            columns: ["client_profile_id"];
            isOneToOne: false;
            referencedRelation: "client_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      property_visits: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          received_at: string;
          property_id: string;
          external_visit_id: string;
          status: "scheduled" | "updated" | "cancelled" | "completed";
          scheduled_at: string | null;
          ended_at: string | null;
          duration_minutes: number | null;
          negotiator_email: string | null;
          negotiator_name: string | null;
          negotiator_phone: string | null;
          contact_external_id: string | null;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          creator_email: string | null;
          creator_name: string | null;
          creator_phone: string | null;
          feedback_rating: number | null;
          feedback_outcome: string | null;
          feedback_comment_public: string | null;
          feedback_comment_internal: string | null;
          feedback_offer_amount: number | null;
          zapier_event: string;
          occurred_at: string;
          raw_payload: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          received_at?: string;
          property_id: string;
          external_visit_id: string;
          status: "scheduled" | "updated" | "cancelled" | "completed";
          scheduled_at?: string | null;
          ended_at?: string | null;
          negotiator_email?: string | null;
          negotiator_name?: string | null;
          negotiator_phone?: string | null;
          contact_external_id?: string | null;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          creator_email?: string | null;
          creator_name?: string | null;
          creator_phone?: string | null;
          feedback_rating?: number | null;
          feedback_outcome?: string | null;
          feedback_comment_public?: string | null;
          feedback_comment_internal?: string | null;
          feedback_offer_amount?: number | null;
          zapier_event: string;
          occurred_at: string;
          raw_payload: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          received_at?: string;
          property_id?: string;
          external_visit_id?: string;
          status?: "scheduled" | "updated" | "cancelled" | "completed";
          scheduled_at?: string | null;
          ended_at?: string | null;
          negotiator_email?: string | null;
          negotiator_name?: string | null;
          negotiator_phone?: string | null;
          contact_external_id?: string | null;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          creator_email?: string | null;
          creator_name?: string | null;
          creator_phone?: string | null;
          feedback_rating?: number | null;
          feedback_outcome?: string | null;
          feedback_comment_public?: string | null;
          feedback_comment_internal?: string | null;
          feedback_offer_amount?: number | null;
          zapier_event?: string;
          occurred_at?: string;
          raw_payload?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "property_visits_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      property_documents: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          property_id: string;
          kind: "file" | "link";
          visibility: "admin_only" | "admin_and_client";
          label: string;
          external_url: string | null;
          storage_bucket: string | null;
          storage_path: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_by_admin_profile_id: string | null;
          uploaded_by_client_profile_id: string | null;
          deleted_at: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          property_id: string;
          kind: "file" | "link";
          visibility?: "admin_only" | "admin_and_client";
          label: string;
          external_url?: string | null;
          storage_bucket?: string | null;
          storage_path?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by_admin_profile_id?: string | null;
          uploaded_by_client_profile_id?: string | null;
          deleted_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          property_id?: string;
          kind?: "file" | "link";
          visibility?: "admin_only" | "admin_and_client";
          label?: string;
          external_url?: string | null;
          storage_bucket?: string | null;
          storage_path?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by_admin_profile_id?: string | null;
          uploaded_by_client_profile_id?: string | null;
          deleted_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      buyer_presented_properties: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          client_project_id: string;
          property_id: string | null;
          label: string;
          address: string | null;
          city: string | null;
          price_amount: number | null;
          rooms: number | null;
          living_area_m2: number | null;
          external_url: string | null;
          notes: string | null;
          created_by_admin_profile_id: string | null;
          archived_at: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id: string;
          property_id?: string | null;
          label: string;
          address?: string | null;
          city?: string | null;
          price_amount?: number | null;
          rooms?: number | null;
          living_area_m2?: number | null;
          external_url?: string | null;
          notes?: string | null;
          created_by_admin_profile_id?: string | null;
          archived_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id?: string;
          property_id?: string | null;
          label?: string;
          address?: string | null;
          city?: string | null;
          price_amount?: number | null;
          rooms?: number | null;
          living_area_m2?: number | null;
          external_url?: string | null;
          notes?: string | null;
          created_by_admin_profile_id?: string | null;
          archived_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_presented_properties_client_project_id_fkey";
            columns: ["client_project_id"];
            isOneToOne: false;
            referencedRelation: "client_projects";
            referencedColumns: ["id"];
          }
        ];
      };
      buyer_presented_property_documents: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          presented_property_id: string;
          kind: "file" | "link";
          visibility: "admin_only" | "admin_and_client";
          label: string;
          external_url: string | null;
          storage_bucket: string | null;
          storage_path: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_by_admin_profile_id: string | null;
          uploaded_by_client_profile_id: string | null;
          deleted_at: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          presented_property_id: string;
          kind: "file" | "link";
          visibility?: "admin_only" | "admin_and_client";
          label: string;
          external_url?: string | null;
          storage_bucket?: string | null;
          storage_path?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by_admin_profile_id?: string | null;
          uploaded_by_client_profile_id?: string | null;
          deleted_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          presented_property_id?: string;
          kind?: "file" | "link";
          visibility?: "admin_only" | "admin_and_client";
          label?: string;
          external_url?: string | null;
          storage_bucket?: string | null;
          storage_path?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by_admin_profile_id?: string | null;
          uploaded_by_client_profile_id?: string | null;
          deleted_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_presented_property_documents_presented_property_id_fkey";
            columns: ["presented_property_id"];
            isOneToOne: false;
            referencedRelation: "buyer_presented_properties";
            referencedColumns: ["id"];
          }
        ];
      };
      ai_conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          client_project_id: string | null;
          seller_lead_id: string | null;
          buyer_lead_id: string | null;
          entity_type: string;
          entity_id: string | null;
          channel: string;
          model: string | null;
          locale: string | null;
          status: string;
          started_at: string;
          ended_at: string | null;
          deleted_at: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id?: string | null;
          seller_lead_id?: string | null;
          buyer_lead_id?: string | null;
          entity_type: string;
          entity_id?: string | null;
          channel: string;
          model?: string | null;
          locale?: string | null;
          status?: string;
          started_at?: string;
          ended_at?: string | null;
          deleted_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_project_id?: string | null;
          seller_lead_id?: string | null;
          buyer_lead_id?: string | null;
          entity_type?: string;
          entity_id?: string | null;
          channel?: string;
          model?: string | null;
          locale?: string | null;
          status?: string;
          started_at?: string;
          ended_at?: string | null;
          deleted_at?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          model: string | null;
          tokens_in: number | null;
          tokens_out: number | null;
          cost_micros: number | null;
          tool_name: string | null;
          tool_version: string | null;
          request_id: string | null;
          finish_reason: string | null;
          created_at: string;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          model?: string | null;
          tokens_in?: number | null;
          tokens_out?: number | null;
          cost_micros?: number | null;
          tool_name?: string | null;
          tool_version?: string | null;
          request_id?: string | null;
          finish_reason?: string | null;
          created_at?: string;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          model?: string | null;
          tokens_in?: number | null;
          tokens_out?: number | null;
          cost_micros?: number | null;
          tool_name?: string | null;
          tool_version?: string | null;
          request_id?: string | null;
          finish_reason?: string | null;
          created_at?: string;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          }
        ];
      };
      entity_embeddings: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          entity_type: string;
          entity_id: string;
          model: string;
          source_text_hash: string;
          source_text_excerpt: string | null;
          embedding: number[];
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          entity_type: string;
          entity_id: string;
          model: string;
          source_text_hash: string;
          source_text_excerpt?: string | null;
          embedding: number[];
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          entity_type?: string;
          entity_id?: string;
          model?: string;
          source_text_hash?: string;
          source_text_excerpt?: string | null;
          embedding?: number[];
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      ai_copilot_usage_daily: {
        Row: {
          id: string;
          admin_profile_id: string;
          day: string;
          tokens_in_total: number;
          tokens_out_total: number;
          cost_micros_total: number;
          iterations_total: number;
          conversations_total: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          admin_profile_id: string;
          day: string;
          tokens_in_total?: number;
          tokens_out_total?: number;
          cost_micros_total?: number;
          iterations_total?: number;
          conversations_total?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          admin_profile_id?: string;
          day?: string;
          tokens_in_total?: number;
          tokens_out_total?: number;
          cost_micros_total?: number;
          iterations_total?: number;
          conversations_total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_copilot_usage_daily_admin_profile_id_fkey";
            columns: ["admin_profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      app_settings: {
        Row: {
          key: string;
          value: Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Record<string, unknown>;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      mynotary_events: {
        Row: {
          id: string;
          received_at: string;
          processed_at: string | null;
          error: string | null;
          event_id: string;
          event_type: string;
          signature: string | null;
          raw_payload: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          received_at?: string;
          processed_at?: string | null;
          error?: string | null;
          event_id: string;
          event_type: string;
          signature?: string | null;
          raw_payload?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          received_at?: string;
          processed_at?: string | null;
          error?: string | null;
          event_id?: string;
          event_type?: string;
          signature?: string | null;
          raw_payload?: Record<string, unknown>;
        };
        Relationships: [];
      };
      mynotary_signed_documents: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          mynotary_operation_id: string;
          mynotary_contract_id: string;
          contract_kind: string;
          contract_type_raw: string | null;
          signed_at: string;
          signers: unknown[];
          files: unknown[];
          raw_payload: Record<string, unknown>;
          matched_seller_project_id: string | null;
          matched_property_id: string | null;
          match_confidence: number | null;
          match_method: string | null;
          match_attempted_at: string | null;
          signed_document_path: string | null;
          signature_proof_path: string | null;
          mynotary_register_type: string | null;
          seller_contacts: unknown[];
          property_price: number | null;
          living_area: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          mynotary_operation_id: string;
          mynotary_contract_id: string;
          contract_kind: string;
          contract_type_raw?: string | null;
          signed_at: string;
          signers?: unknown[];
          files?: unknown[];
          raw_payload?: Record<string, unknown>;
          matched_seller_project_id?: string | null;
          matched_property_id?: string | null;
          match_confidence?: number | null;
          match_method?: string | null;
          match_attempted_at?: string | null;
          signed_document_path?: string | null;
          signature_proof_path?: string | null;
          mynotary_register_type?: string | null;
          seller_contacts?: unknown[];
          property_price?: number | null;
          living_area?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          mynotary_operation_id?: string;
          mynotary_contract_id?: string;
          contract_kind?: string;
          contract_type_raw?: string | null;
          signed_at?: string;
          signers?: unknown[];
          files?: unknown[];
          raw_payload?: Record<string, unknown>;
          matched_seller_project_id?: string | null;
          matched_property_id?: string | null;
          match_confidence?: number | null;
          match_method?: string | null;
          match_attempted_at?: string | null;
          signed_document_path?: string | null;
          signature_proof_path?: string | null;
          mynotary_register_type?: string | null;
          seller_contacts?: unknown[];
          property_price?: number | null;
          living_area?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "mynotary_signed_documents_matched_seller_project_id_fkey";
            columns: ["matched_seller_project_id"];
            isOneToOne: false;
            referencedRelation: "seller_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mynotary_signed_documents_matched_property_id_fkey";
            columns: ["matched_property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      reconciliation_suggestions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          source_kind: string;
          source_ref: string;
          target_client_project_id: string | null;
          score: number;
          reasons: unknown[];
          fields_preview: Record<string, unknown>;
          status: string;
          resolved_at: string | null;
          resolved_by_admin_profile_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          source_kind: string;
          source_ref: string;
          target_client_project_id?: string | null;
          score?: number;
          reasons?: unknown[];
          fields_preview?: Record<string, unknown>;
          status?: string;
          resolved_at?: string | null;
          resolved_by_admin_profile_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          source_kind?: string;
          source_ref?: string;
          target_client_project_id?: string | null;
          score?: number;
          reasons?: unknown[];
          fields_preview?: Record<string, unknown>;
          status?: string;
          resolved_at?: string | null;
          resolved_by_admin_profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reconciliation_suggestions_target_client_project_id_fkey";
            columns: ["target_client_project_id"];
            isOneToOne: false;
            referencedRelation: "client_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reconciliation_suggestions_resolved_by_admin_profile_id_fkey";
            columns: ["resolved_by_admin_profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      mynotary_match_address: {
        Args: {
          p_query: string;
          p_min_similarity?: number;
          p_limit?: number;
        };
        Returns: Array<{
          property_id: string;
          similarity: number;
        }>;
      };
      mynotary_match_seller_project_by_address: {
        Args: {
          p_query: string;
          p_min_similarity?: number;
          p_limit?: number;
        };
        Returns: Array<{
          seller_project_id: string;
          seller_lead_id: string;
          property_address: string;
          similarity: number;
        }>;
      };
      mynotary_match_seller_project_by_names: {
        Args: {
          p_names: string[];
          p_min_similarity?: number;
          p_limit?: number;
        };
        Returns: Array<{
          seller_project_id: string;
          seller_lead_id: string;
          full_name: string;
          matched_query: string;
          similarity: number;
        }>;
      };
      bump_ai_copilot_usage: {
        Args: {
          p_admin_profile_id: string;
          p_tokens_in: number;
          p_tokens_out: number;
          p_cost_micros: number;
          p_iterations?: number;
          p_conversations?: number;
        };
        Returns: Array<{
          day: string;
          tokens_in_total: number;
          tokens_out_total: number;
          cost_micros_total: number;
          iterations_total: number;
          conversations_total: number;
        }>;
      };
      rate_limit_hit: {
        Args: {
          p_key: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: Array<{
          allowed: boolean;
          remaining: number;
          reset_at: string;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
