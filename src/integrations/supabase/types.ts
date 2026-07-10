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
      appointments: {
        Row: {
          contact_id: string
          created_at: string
          end_time: string
          id: string
          notes: string | null
          owner_id: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          subject: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          owner_id: string
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          subject?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          owner_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          subject?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_settings: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          personality: string
          system_prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          personality?: string
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          personality?: string
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          budget: number | null
          created_at: string
          email: string | null
          id: string
          is_subscribed: boolean
          last_interaction_at: string | null
          locale: string | null
          name: string | null
          notes: string | null
          owner_id: string
          phone_number: string
          preferences: Json
          requirements: Json
          updated_at: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          email?: string | null
          id?: string
          is_subscribed?: boolean
          last_interaction_at?: string | null
          locale?: string | null
          name?: string | null
          notes?: string | null
          owner_id: string
          phone_number: string
          preferences?: Json
          requirements?: Json
          updated_at?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          email?: string | null
          id?: string
          is_subscribed?: boolean
          last_interaction_at?: string | null
          locale?: string | null
          name?: string | null
          notes?: string | null
          owner_id?: string
          phone_number?: string
          preferences?: Json
          requirements?: Json
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          last_bot_message_at: string | null
          last_bot_message_text: string | null
          last_user_message_at: string | null
          last_user_message_text: string | null
          metadata: Json
          owner_id: string
          session_open: boolean
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          last_bot_message_at?: string | null
          last_bot_message_text?: string | null
          last_user_message_at?: string | null
          last_user_message_text?: string | null
          metadata?: Json
          owner_id: string
          session_open?: boolean
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          last_bot_message_at?: string | null
          last_bot_message_text?: string | null
          last_user_message_at?: string | null
          last_user_message_text?: string | null
          metadata?: Json
          owner_id?: string
          session_open?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          contact_id: string
          content: string | null
          created_at: string
          direction: string
          id: string
          message_type: string
          owner_id: string
          template_name: string | null
          whatsable_response: Json | null
        }
        Insert: {
          contact_id: string
          content?: string | null
          created_at?: string
          direction: string
          id?: string
          message_type?: string
          owner_id: string
          template_name?: string | null
          whatsable_response?: Json | null
        }
        Update: {
          contact_id?: string
          content?: string | null
          created_at?: string
          direction?: string
          id?: string
          message_type?: string
          owner_id?: string
          template_name?: string | null
          whatsable_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
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
      schedule_settings: {
        Row: {
          appointment_duration_minutes: number
          buffer_minutes: number
          created_at: string
          id: string
          owner_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          appointment_duration_minutes?: number
          buffer_minutes?: number
          created_at?: string
          id?: string
          owner_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          appointment_duration_minutes?: number
          buffer_minutes?: number
          created_at?: string
          id?: string
          owner_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      working_hours: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_enabled: boolean
          owner_id: string
          schedule_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time?: string
          id?: string
          is_enabled?: boolean
          owner_id: string
          schedule_id: string
          start_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_enabled?: boolean
          owner_id?: string
          schedule_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "working_hours_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedule_settings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ai_provider: "lovable" | "openai" | "gemini"
      appointment_status:
        | "PENDING_CONFIRMATION"
        | "CONFIRMED"
        | "CANCELLED"
        | "RESCHEDULE_REQUESTED"
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
      appointment_status: [
        "PENDING_CONFIRMATION",
        "CONFIRMED",
        "CANCELLED",
        "RESCHEDULE_REQUESTED",
      ],
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
