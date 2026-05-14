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
      medication_logs: {
        Row: {
          acted_at: string
          id: string
          logged_by: string | null
          medication_id: string
          patient_id: string
          scheduled_at: string
          snooze_until: string | null
          source: Database["public"]["Enums"]["med_log_source"]
          status: Database["public"]["Enums"]["med_log_status"]
        }
        Insert: {
          acted_at?: string
          id?: string
          logged_by?: string | null
          medication_id: string
          patient_id: string
          scheduled_at: string
          snooze_until?: string | null
          source?: Database["public"]["Enums"]["med_log_source"]
          status: Database["public"]["Enums"]["med_log_status"]
        }
        Update: {
          acted_at?: string
          id?: string
          logged_by?: string | null
          medication_id?: string
          patient_id?: string
          scheduled_at?: string
          snooze_until?: string | null
          source?: Database["public"]["Enums"]["med_log_source"]
          status?: Database["public"]["Enums"]["med_log_status"]
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          brand_name: string | null
          color: string
          common_name: string
          created_at: string
          created_by: string | null
          dose: string | null
          id: string
          instructions: string | null
          patient_id: string
          schedule_times: string[]
          shape: string
        }
        Insert: {
          active?: boolean
          brand_name?: string | null
          color?: string
          common_name: string
          created_at?: string
          created_by?: string | null
          dose?: string | null
          id?: string
          instructions?: string | null
          patient_id: string
          schedule_times?: string[]
          shape?: string
        }
        Update: {
          active?: boolean
          brand_name?: string | null
          color?: string
          common_name?: string
          created_at?: string
          created_by?: string | null
          dose?: string | null
          id?: string
          instructions?: string | null
          patient_id?: string
          schedule_times?: string[]
          shape?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_required: boolean
          body: string | null
          created_at: string
          id: string
          medication_id: string | null
          read_at: string | null
          snooze_until: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_required?: boolean
          body?: string | null
          created_at?: string
          id?: string
          medication_id?: string | null
          read_at?: string | null
          snooze_until?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_required?: boolean
          body?: string | null
          created_at?: string
          id?: string
          medication_id?: string | null
          read_at?: string | null
          snooze_until?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_availability: {
        Row: {
          medicines: Json
          pharmacist_id: string
          updated_at: string
        }
        Insert: {
          medicines?: Json
          pharmacist_id: string
          updated_at?: string
        }
        Update: {
          medicines?: Json
          pharmacist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pharmacy_medicines: {
        Row: {
          created_at: string
          created_by: string | null
          dosage: string | null
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dosage?: string | null
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dosage?: string | null
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          created_at: string
          dispensed_at: string | null
          doctor_id: string
          id: string
          items: Json
          notes: string | null
          patient_id: string
          pharmacist_id: string | null
          qr_token: string
          status: Database["public"]["Enums"]["prescription_status"]
        }
        Insert: {
          created_at?: string
          dispensed_at?: string | null
          doctor_id: string
          id?: string
          items?: Json
          notes?: string | null
          patient_id: string
          pharmacist_id?: string | null
          qr_token?: string
          status?: Database["public"]["Enums"]["prescription_status"]
        }
        Update: {
          created_at?: string
          dispensed_at?: string | null
          doctor_id?: string
          id?: string
          items?: Json
          notes?: string | null
          patient_id?: string
          pharmacist_id?: string | null
          qr_token?: string
          status?: Database["public"]["Enums"]["prescription_status"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          doctor_id: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          doctor_id?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          doctor_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      verification_documents: {
        Row: {
          created_at: string
          file_path: string
          id: string
          kind: string
          notes: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          kind: string
          notes?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          kind?: string
          notes?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_patient_doctor: { Args: { _patient: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "doctor" | "pharmacist" | "admin"
      med_log_source: "patient" | "doctor" | "system"
      med_log_status: "taken" | "skipped" | "snoozed" | "missed"
      prescription_status:
        | "issued"
        | "verified"
        | "dispensed"
        | "expired"
        | "cancelled"
      verification_status: "pending" | "approved" | "rejected"
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
      app_role: ["patient", "doctor", "pharmacist", "admin"],
      med_log_source: ["patient", "doctor", "system"],
      med_log_status: ["taken", "skipped", "snoozed", "missed"],
      prescription_status: [
        "issued",
        "verified",
        "dispensed",
        "expired",
        "cancelled",
      ],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
