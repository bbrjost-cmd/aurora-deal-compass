export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_profile_id: string | null
          created_at: string
          deal_id: string | null
          diff_json: Json | null
          id: string
          org_id: string
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          created_at?: string
          deal_id?: string | null
          diff_json?: Json | null
          id?: string
          org_id: string
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          created_at?: string
          deal_id?: string | null
          diff_json?: Json | null
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      cached_overpass: {
        Row: {
          center_lat: number
          center_lon: number
          fetched_at: string
          geojson: Json
          id: string
          layer: string
          query_hash: string
          radius_m: number
        }
        Insert: {
          center_lat: number
          center_lon: number
          fetched_at?: string
          geojson?: Json
          id?: string
          layer: string
          query_hash: string
          radius_m: number
        }
        Update: {
          center_lat?: number
          center_lon?: number
          fetched_at?: string
          geojson?: Json
          id?: string
          layer?: string
          query_hash?: string
          radius_m?: number
        }
        Relationships: []
      }
      city_benchmarks: {
        Row: {
          adr_high: number
          adr_low: number
          cap_rate_high: number
          cap_rate_low: number
          city: string
          gop_high: number
          gop_low: number
          id: string
          occ_high: number
          occ_low: number
          org_id: string
          source_note: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          adr_high?: number
          adr_low?: number
          cap_rate_high?: number
          cap_rate_low?: number
          city: string
          gop_high?: number
          gop_low?: number
          id?: string
          occ_high?: number
          occ_low?: number
          org_id: string
          source_note?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          adr_high?: number
          adr_low?: number
          cap_rate_high?: number
          cap_rate_low?: number
          city?: string
          gop_high?: number
          gop_low?: number
          id?: string
          occ_high?: number
          occ_low?: number
          org_id?: string
          source_note?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_benchmarks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      city_settings: {
        Row: {
          center_lat: number
          center_lon: number
          city: string
          id: string
          org_id: string
          state: string
        }
        Insert: {
          center_lat: number
          center_lon: number
          city: string
          id?: string
          org_id: string
          state: string
        }
        Update: {
          center_lat?: number
          center_lon?: number
          city?: string
          id?: string
          org_id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          deal_id: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          role: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          deal_id?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          deal_id?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_notes: {
        Row: {
          content: string
          created_at: string
          deal_id: string | null
          id: string
          org_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deal_id?: string | null
          id?: string
          org_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          lat: number | null
          lon: number | null
          name: string
          opening_type: string | null
          org_id: string
          rooms_max: number | null
          rooms_min: number | null
          score_breakdown: Json | null
          score_total: number | null
          segment: string | null
          stage: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lon?: number | null
          name: string
          opening_type?: string | null
          org_id: string
          rooms_max?: number | null
          rooms_min?: number | null
          score_breakdown?: Json | null
          score_total?: number | null
          segment?: string | null
          stage?: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lon?: number | null
          name?: string
          opening_type?: string | null
          org_id?: string
          rooms_max?: number | null
          rooms_min?: number | null
          score_breakdown?: Json | null
          score_total?: number | null
          segment?: string | null
          stage?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_history: {
        Row: {
          conditions_json: Json | null
          confidence: string
          created_at: string
          data_completeness: number | null
          deal_id: string | null
          decision: string
          hard_gates_json: Json | null
          ic_score: number
          id: string
          narrative_text: string | null
          org_id: string
          overridden_by_profile_id: string | null
          override_reason: string | null
          red_flags_json: Json | null
          thresholds_json: Json | null
        }
        Insert: {
          conditions_json?: Json | null
          confidence?: string
          created_at?: string
          data_completeness?: number | null
          deal_id?: string | null
          decision: string
          hard_gates_json?: Json | null
          ic_score?: number
          id?: string
          narrative_text?: string | null
          org_id: string
          overridden_by_profile_id?: string | null
          override_reason?: string | null
          red_flags_json?: Json | null
          thresholds_json?: Json | null
        }
        Update: {
          conditions_json?: Json | null
          confidence?: string
          created_at?: string
          data_completeness?: number | null
          deal_id?: string | null
          decision?: string
          hard_gates_json?: Json | null
          ic_score?: number
          id?: string
          narrative_text?: string | null
          org_id?: string
          overridden_by_profile_id?: string | null
          override_reason?: string | null
          red_flags_json?: Json | null
          thresholds_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_history_overridden_by_profile_id_fkey"
            columns: ["overridden_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      docs: {
        Row: {
          created_at: string
          deal_id: string | null
          id: string
          org_id: string
          storage_path: string | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          id?: string
          org_id: string
          storage_path?: string | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          id?: string
          org_id?: string
          storage_path?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      feasibility_inputs: {
        Row: {
          deal_id: string | null
          id: string
          inputs: Json
          org_id: string
          updated_at: string
        }
        Insert: {
          deal_id?: string | null
          id?: string
          inputs?: Json
          org_id: string
          updated_at?: string
        }
        Update: {
          deal_id?: string | null
          id?: string
          inputs?: Json
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feasibility_inputs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_inputs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      feasibility_outputs: {
        Row: {
          deal_id: string | null
          id: string
          org_id: string
          outputs: Json
          updated_at: string
        }
        Insert: {
          deal_id?: string | null
          id?: string
          org_id: string
          outputs?: Json
          updated_at?: string
        }
        Update: {
          deal_id?: string | null
          id?: string
          org_id?: string
          outputs?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feasibility_outputs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feasibility_outputs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_boundaries: {
        Row: {
          geojson: Json
          id: string
          name: string
          org_id: string
          type: string
          uploaded_at: string
        }
        Insert: {
          geojson?: Json
          id?: string
          name: string
          org_id: string
          type: string
          uploaded_at?: string
        }
        Update: {
          geojson?: Json
          id?: string
          name?: string
          org_id?: string
          type?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_boundaries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      loi_checklist: {
        Row: {
          checked: boolean
          created_at: string
          deal_id: string
          id: string
          item: string
          org_id: string
          stage_requirement: string | null
        }
        Insert: {
          checked?: boolean
          created_at?: string
          deal_id: string
          id?: string
          item: string
          org_id: string
          stage_requirement?: string | null
        }
        Update: {
          checked?: boolean
          created_at?: string
          deal_id?: string
          id?: string
          item?: string
          org_id?: string
          stage_requirement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loi_checklist_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loi_checklist_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_thresholds: {
        Row: {
          competitor_density_threshold: number
          id: string
          max_payback_years: number
          min_dscr: number
          min_net_fees_usd: number
          min_roi_pct: number
          min_rooms_upscale: number
          min_yoc_luxury: number
          min_yoc_upscale: number
          org_id: string
          updated_at: string
        }
        Insert: {
          competitor_density_threshold?: number
          id?: string
          max_payback_years?: number
          min_dscr?: number
          min_net_fees_usd?: number
          min_roi_pct?: number
          min_rooms_upscale?: number
          min_yoc_luxury?: number
          min_yoc_upscale?: number
          org_id: string
          updated_at?: string
        }
        Update: {
          competitor_density_threshold?: number
          id?: string
          max_payback_years?: number
          min_dscr?: number
          min_net_fees_usd?: number
          min_roi_pct?: number
          min_rooms_upscale?: number
          min_yoc_luxury?: number
          min_yoc_upscale?: number
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_thresholds_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          org_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          org_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          deal_id: string | null
          due_date: string | null
          id: string
          org_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          due_date?: string | null
          id?: string
          org_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          due_date?: string | null
          id?: string
          org_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
    },
  },
} as const
