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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      favorites: {
        Row: {
          created_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          author_id: string | null
          bison: boolean
          by_label: string
          by_role: string
          created_at: string
          daily_end: number | null
          daily_start: number | null
          description: string
          dow: number[] | null
          end_at: string
          flags: number
          flags_base: number
          food: string
          free: boolean
          id: string
          id_req: string
          kind: string
          lat: number
          lng: number
          location: string
          match_txt: string | null
          recurring: string | null
          season_end: number | null
          season_start: number | null
          season_txt: string | null
          snap: boolean
          start_at: string
          student_only: boolean
          title: string
          vcount: number
          vcount_base: number
          venue_id: string | null
          verified_at: string | null
        }
        Insert: {
          author_id?: string | null
          bison?: boolean
          by_label?: string
          by_role?: string
          created_at?: string
          daily_end?: number | null
          daily_start?: number | null
          description?: string
          dow?: number[] | null
          end_at: string
          flags?: number
          flags_base?: number
          food?: string
          free?: boolean
          id?: string
          id_req?: string
          kind: string
          lat: number
          lng: number
          location: string
          match_txt?: string | null
          recurring?: string | null
          season_end?: number | null
          season_start?: number | null
          season_txt?: string | null
          snap?: boolean
          start_at: string
          student_only?: boolean
          title: string
          vcount?: number
          vcount_base?: number
          venue_id?: string | null
          verified_at?: string | null
        }
        Update: {
          author_id?: string | null
          bison?: boolean
          by_label?: string
          by_role?: string
          created_at?: string
          daily_end?: number | null
          daily_start?: number | null
          description?: string
          dow?: number[] | null
          end_at?: string
          flags?: number
          flags_base?: number
          food?: string
          free?: boolean
          id?: string
          id_req?: string
          kind?: string
          lat?: number
          lng?: number
          location?: string
          match_txt?: string | null
          recurring?: string | null
          season_end?: number | null
          season_start?: number | null
          season_txt?: string | null
          snap?: boolean
          start_at?: string
          student_only?: boolean
          title?: string
          vcount?: number
          vcount_base?: number
          venue_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          item_id: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          item_id?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          item_id?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          grad_year: number | null
          howard_id: string | null
          notify_deals: boolean
          notify_events: boolean
          org: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          grad_year?: number | null
          howard_id?: string | null
          notify_deals?: boolean
          notify_events?: boolean
          org?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          grad_year?: number | null
          howard_id?: string | null
          notify_deals?: boolean
          notify_events?: boolean
          org?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string
          created_at: string
          id: string
          price: number
          user_id: string | null
          value: number
          venue_id: string
          who: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          price: number
          user_id?: string | null
          value: number
          venue_id: string
          who?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          price?: number
          user_id?: string | null
          value?: number
          venue_id?: string
          who?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
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
      venues: {
        Row: {
          addr: string
          bison: boolean
          campus_only: boolean
          cost: number
          ebt: boolean
          halal: boolean
          hours: Json
          id: string
          lat: number
          lng: number
          name: string
          sample: boolean
          type: string
          unit: string
          veg: boolean
        }
        Insert: {
          addr: string
          bison?: boolean
          campus_only?: boolean
          cost?: number
          ebt?: boolean
          halal?: boolean
          hours: Json
          id: string
          lat: number
          lng: number
          name: string
          sample?: boolean
          type: string
          unit?: string
          veg?: boolean
        }
        Update: {
          addr?: string
          bison?: boolean
          campus_only?: boolean
          cost?: number
          ebt?: boolean
          halal?: boolean
          hours?: Json
          id?: string
          lat?: number
          lng?: number
          name?: string
          sample?: boolean
          type?: string
          unit?: string
          veg?: boolean
        }
        Relationships: []
      }
      votes: {
        Row: {
          item_id: string
          updated_at: string
          user_id: string
          vote: string
        }
        Insert: {
          item_id: string
          updated_at?: string
          user_id: string
          vote: string
        }
        Update: {
          item_id?: string
          updated_at?: string
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_student: { Args: { _user_id: string }; Returns: boolean }
      is_verified: { Args: { _user_id: string }; Returns: boolean }
      item_teasers: {
        Args: never
        Returns: {
          daily_end: number
          daily_start: number
          dow: number[]
          end_at: string
          flags: number
          free: boolean
          id: string
          id_req: string
          kind: string
          lat: number
          lng: number
          start_at: string
          student_only: boolean
        }[]
      }
    }
    Enums: {
      app_role: "student" | "org" | "alumni"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["student", "org", "alumni"],
    },
  },
} as const
