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
          assigned_admin_profile_id: string | null;
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
          assigned_admin_profile_id?: string | null;
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
          assigned_admin_profile_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: "seller_leads_assigned_admin_profile_id_fkey";
            columns: ["assigned_admin_profile_id"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          }
        ];
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
