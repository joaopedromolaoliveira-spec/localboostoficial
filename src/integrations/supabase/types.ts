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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliates: {
        Row: {
          code: string
          commission_pct: number
          created_at: string
          earnings_cents: number
          id: string
          paid_cents: number
          user_id: string
        }
        Insert: {
          code: string
          commission_pct?: number
          created_at?: string
          earnings_cents?: number
          id?: string
          paid_cents?: number
          user_id: string
        }
        Update: {
          code?: string
          commission_pct?: number
          created_at?: string
          earnings_cents?: number
          id?: string
          paid_cents?: number
          user_id?: string
        }
        Relationships: []
      }
      ai_assistants: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          knowledge: string | null
          model: string
          name: string
          owner_id: string
          provider: Database["public"]["Enums"]["ai_provider"]
          system_prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          knowledge?: string | null
          model?: string
          name?: string
          owner_id: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          knowledge?: string | null
          model?: string
          name?: string
          owner_id?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      automations: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          name: string
          owner_id: string
          runs_count: number
          steps: Json
          trigger_config: Json
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          owner_id: string
          runs_count?: number
          steps?: Json
          trigger_config?: Json
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          owner_id?: string
          runs_count?: number
          steps?: Json
          trigger_config?: Json
          trigger_type?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string
          failed_count: number
          id: string
          media_url: string | null
          message: string
          name: string
          owner_id: string
          scheduled_at: string | null
          sent_count: number
          status: Database["public"]["Enums"]["campaign_status"]
          target_stage: Database["public"]["Enums"]["contact_stage"] | null
          target_tags: string[]
          total_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          failed_count?: number
          id?: string
          media_url?: string | null
          message: string
          name: string
          owner_id: string
          scheduled_at?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["campaign_status"]
          target_stage?: Database["public"]["Enums"]["contact_stage"] | null
          target_tags?: string[]
          total_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          failed_count?: number
          id?: string
          media_url?: string | null
          message?: string
          name?: string
          owner_id?: string
          scheduled_at?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["campaign_status"]
          target_stage?: Database["public"]["Enums"]["contact_stage"] | null
          target_tags?: string[]
          total_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          last_contacted_at: string | null
          name: string | null
          notes: string | null
          owner_id: string
          phone: string
          stage: Database["public"]["Enums"]["contact_stage"]
          tags: string[]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string | null
          notes?: string | null
          owner_id: string
          phone: string
          stage?: Database["public"]["Enums"]["contact_stage"]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string
          stage?: Database["public"]["Enums"]["contact_stage"]
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          ai_enabled: boolean
          assigned_to: string | null
          contact_id: string
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          owner_id: string
          session_id: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          unread_count: number
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          assigned_to?: string | null
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          owner_id: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          unread_count?: number
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          assigned_to?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          owner_id?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          is_ai: boolean
          kind: Database["public"]["Enums"]["message_kind"]
          media_url: string | null
          owner_id: string
          sent_by: string | null
          status: Database["public"]["Enums"]["message_status"]
          waha_id: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          id?: string
          is_ai?: boolean
          kind?: Database["public"]["Enums"]["message_kind"]
          media_url?: string | null
          owner_id: string
          sent_by?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          waha_id?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          is_ai?: boolean
          kind?: Database["public"]["Enums"]["message_kind"]
          media_url?: string | null
          owner_id?: string
          sent_by?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          waha_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_catalog: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json
          highlight: boolean
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sort_order: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          highlight?: boolean
          id: string
          is_active?: boolean
          name: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          highlight?: boolean
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_cents: number | null
          created_at: string
          current_period_end: string | null
          id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          accepted_at: string | null
          email: string
          id: string
          invited_at: string
          member_user_id: string | null
          name: string | null
          owner_id: string
          role: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          id?: string
          invited_at?: string
          member_user_id?: string | null
          name?: string | null
          owner_id: string
          role?: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          id?: string
          invited_at?: string
          member_user_id?: string | null
          name?: string | null
          owner_id?: string
          role?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waha_config: {
        Row: {
          api_key: string | null
          base_url: string | null
          created_at: string
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string
          id?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          created_at: string
          id: string
          last_status_at: string
          name: string
          owner_id: string
          phone_number: string | null
          qr_code: string | null
          status: Database["public"]["Enums"]["waha_status"]
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_status_at?: string
          name?: string
          owner_id: string
          phone_number?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["waha_status"]
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_status_at?: string
          name?: string
          owner_id?: string
          phone_number?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["waha_status"]
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_user_plan: {
        Args: {
          _period_end?: string
          _plan: Database["public"]["Enums"]["plan_tier"]
          _status?: Database["public"]["Enums"]["subscription_status"]
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      ai_provider: "lovable" | "openai" | "gemini"
      app_role: "admin" | "manager" | "partner" | "user"
      automation_trigger:
        | "keyword"
        | "first_message"
        | "tag_added"
        | "schedule"
        | "webhook"
      campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "done"
        | "canceled"
        | "failed"
      contact_stage: "lead" | "qualified" | "customer" | "lost"
      conversation_status: "open" | "pending" | "resolved" | "snoozed"
      message_direction: "inbound" | "outbound"
      message_kind:
        | "text"
        | "image"
        | "audio"
        | "video"
        | "document"
        | "location"
        | "template"
        | "system"
      message_status: "queued" | "sent" | "delivered" | "read" | "failed"
      plan_tier: "trial" | "starter" | "pro" | "business"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
      waha_status:
        | "disconnected"
        | "connecting"
        | "scan_qr"
        | "working"
        | "failed"
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
      ai_provider: ["lovable", "openai", "gemini"],
      app_role: ["admin", "manager", "partner", "user"],
      automation_trigger: [
        "keyword",
        "first_message",
        "tag_added",
        "schedule",
        "webhook",
      ],
      campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "done",
        "canceled",
        "failed",
      ],
      contact_stage: ["lead", "qualified", "customer", "lost"],
      conversation_status: ["open", "pending", "resolved", "snoozed"],
      message_direction: ["inbound", "outbound"],
      message_kind: [
        "text",
        "image",
        "audio",
        "video",
        "document",
        "location",
        "template",
        "system",
      ],
      message_status: ["queued", "sent", "delivered", "read", "failed"],
      plan_tier: ["trial", "starter", "pro", "business"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
      ],
      waha_status: [
        "disconnected",
        "connecting",
        "scan_qr",
        "working",
        "failed",
      ],
    },
  },
} as const
