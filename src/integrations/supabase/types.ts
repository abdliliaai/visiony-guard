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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      vy_apikey: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          last_used: string | null
          name: string
          scopes: string[] | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          last_used?: string | null
          name: string
          scopes?: string[] | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          last_used?: string | null
          name?: string
          scopes?: string[] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vy_apikey_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vy_tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      vy_device: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean | null
          id: string
          last_seen: string | null
          location: string | null
          name: string
          online: boolean | null
          roi_polygons: Json | null
          rtsp_url: string | null
          stream_config: Json | null
          tenant_id: string
          updated_at: string
          webrtc_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          last_seen?: string | null
          location?: string | null
          name: string
          online?: boolean | null
          roi_polygons?: Json | null
          rtsp_url?: string | null
          stream_config?: Json | null
          tenant_id: string
          updated_at?: string
          webrtc_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          last_seen?: string | null
          location?: string | null
          name?: string
          online?: boolean | null
          roi_polygons?: Json | null
          rtsp_url?: string | null
          stream_config?: Json | null
          tenant_id?: string
          updated_at?: string
          webrtc_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vy_device_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vy_tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      vy_event: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          bbox: Json | null
          class_name: Database["public"]["Enums"]["detection_class"] | null
          clip_url: string | null
          confidence: number | null
          created_at: string
          device_id: string
          id: string
          image_url: string | null
          meta: Json | null
          occurred_at: string
          severity: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          bbox?: Json | null
          class_name?: Database["public"]["Enums"]["detection_class"] | null
          clip_url?: string | null
          confidence?: number | null
          created_at?: string
          device_id: string
          id?: string
          image_url?: string | null
          meta?: Json | null
          occurred_at?: string
          severity?: string | null
          tenant_id: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          bbox?: Json | null
          class_name?: Database["public"]["Enums"]["detection_class"] | null
          clip_url?: string | null
          confidence?: number | null
          created_at?: string
          device_id?: string
          id?: string
          image_url?: string | null
          meta?: Json | null
          occurred_at?: string
          severity?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vy_event_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "vy_device"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vy_event_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vy_tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      vy_invite: {
        Row: {
          accepted: boolean | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          token: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          token?: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "vy_invite_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "vy_org"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vy_invite_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vy_tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      vy_mobile_token: {
        Row: {
          created_at: string
          device_info: Json | null
          fcm_token: string
          id: string
          last_seen: string
          platform: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          fcm_token: string
          id?: string
          last_seen?: string
          platform: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          fcm_token?: string
          id?: string
          last_seen?: string
          platform?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vy_mobile_token_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vy_tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      vy_org: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      vy_schedule: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          hours_json: Json
          id: string
          name: string
          tenant_id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          hours_json?: Json
          id?: string
          name: string
          tenant_id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          hours_json?: Json
          id?: string
          name?: string
          tenant_id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vy_schedule_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vy_tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      vy_setting: {
        Row: {
          id: string
          key: string
          tenant_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          tenant_id: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          tenant_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "vy_setting_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vy_tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      vy_tenant: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          org_id: string
          parent_tenant_id: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          org_id: string
          parent_tenant_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          parent_tenant_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vy_tenant_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "vy_org"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vy_tenant_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "vy_tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      vy_threshold: {
        Row: {
          class_name: Database["public"]["Enums"]["detection_class"]
          enabled: boolean | null
          id: string
          min_confidence: number
          nms_iou: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          class_name: Database["public"]["Enums"]["detection_class"]
          enabled?: boolean | null
          id?: string
          min_confidence?: number
          nms_iou?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          class_name?: Database["public"]["Enums"]["detection_class"]
          enabled?: boolean | null
          id?: string
          min_confidence?: number
          nms_iou?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vy_threshold_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vy_tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      vy_user_profile: {
        Row: {
          created_at: string
          first_name: string | null
          last_name: string | null
          org_id: string
          phone: string | null
          preferences: Json | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          org_id: string
          phone?: string | null
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          org_id?: string
          phone?: string | null
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vy_user_profile_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "vy_org"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vy_user_profile_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "vy_tenant"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_tenant: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      vy_event_summary: {
        Args: { _from?: string; _tenant_id: string; _to?: string }
        Returns: {
          class_name: string
          device_name: string
          event_count: number
          severity_counts: Json
        }[]
      }
    }
    Enums: {
      detection_class:
        | "person"
        | "car"
        | "truck"
        | "motorcycle"
        | "bicycle"
        | "animal"
        | "package"
        | "unknown"
      event_type: "detection" | "alert" | "behavior" | "system"
      user_role:
        | "root_admin"
        | "tenant_admin"
        | "manager"
        | "analyst"
        | "viewer"
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
      detection_class: [
        "person",
        "car",
        "truck",
        "motorcycle",
        "bicycle",
        "animal",
        "package",
        "unknown",
      ],
      event_type: ["detection", "alert", "behavior", "system"],
      user_role: ["root_admin", "tenant_admin", "manager", "analyst", "viewer"],
    },
  },
} as const
