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
      alerts: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          rule_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rule_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rule_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          payload: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          payload?: Json
        }
        Relationships: []
      }
      bankroll_transactions: {
        Row: {
          amount: number
          bankroll_id: string
          bet_id: string | null
          created_at: string
          description: string | null
          id: string
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Insert: {
          amount: number
          bankroll_id: string
          bet_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Update: {
          amount?: number
          bankroll_id?: string
          bet_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bankroll_transactions_bankroll_id_fkey"
            columns: ["bankroll_id"]
            isOneToOne: false
            referencedRelation: "bankrolls"
            referencedColumns: ["id"]
          },
        ]
      }
      bankrolls: {
        Row: {
          created_at: string
          currency: string
          current_balance: number
          id: string
          initial_balance: number
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bet_legs: {
        Row: {
          bet_id: string
          estimated_probability: number | null
          id: string
          league: string | null
          market: string | null
          match_description: string | null
          odd: number
          position: number
          selection: string | null
          sport: string | null
          status: Database["public"]["Enums"]["bet_status"]
          user_id: string
        }
        Insert: {
          bet_id: string
          estimated_probability?: number | null
          id?: string
          league?: string | null
          market?: string | null
          match_description?: string | null
          odd: number
          position?: number
          selection?: string | null
          sport?: string | null
          status?: Database["public"]["Enums"]["bet_status"]
          user_id: string
        }
        Update: {
          bet_id?: string
          estimated_probability?: number | null
          id?: string
          league?: string | null
          market?: string | null
          match_description?: string | null
          odd?: number
          position?: number
          selection?: string | null
          sport?: string | null
          status?: Database["public"]["Enums"]["bet_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bet_legs_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "bets"
            referencedColumns: ["id"]
          },
        ]
      }
      bets: {
        Row: {
          bankroll_id: string | null
          bet_type: Database["public"]["Enums"]["bet_type"]
          bookmaker: string | null
          created_at: string
          estimated_probability: number | null
          ev: number | null
          id: string
          league: string | null
          market: string | null
          match_description: string | null
          notes: string | null
          odd: number
          payout: number | null
          placed_at: string
          profit: number
          selection: string | null
          settled_at: string | null
          sport: string | null
          stake: number
          status: Database["public"]["Enums"]["bet_status"]
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bankroll_id?: string | null
          bet_type?: Database["public"]["Enums"]["bet_type"]
          bookmaker?: string | null
          created_at?: string
          estimated_probability?: number | null
          ev?: number | null
          id?: string
          league?: string | null
          market?: string | null
          match_description?: string | null
          notes?: string | null
          odd: number
          payout?: number | null
          placed_at?: string
          profit?: number
          selection?: string | null
          settled_at?: string | null
          sport?: string | null
          stake: number
          status?: Database["public"]["Enums"]["bet_status"]
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bankroll_id?: string | null
          bet_type?: Database["public"]["Enums"]["bet_type"]
          bookmaker?: string | null
          created_at?: string
          estimated_probability?: number | null
          ev?: number | null
          id?: string
          league?: string | null
          market?: string | null
          match_description?: string | null
          notes?: string | null
          odd?: number
          payout?: number | null
          placed_at?: string
          profit?: number
          selection?: string | null
          settled_at?: string | null
          sport?: string | null
          stake?: number
          status?: Database["public"]["Enums"]["bet_status"]
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bets_bankroll_id_fkey"
            columns: ["bankroll_id"]
            isOneToOne: false
            referencedRelation: "bankrolls"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmakers: {
        Row: {
          created_at: string
          external_key: string | null
          id: string
          name: string
          region: string | null
        }
        Insert: {
          created_at?: string
          external_key?: string | null
          id?: string
          name: string
          region?: string | null
        }
        Update: {
          created_at?: string
          external_key?: string | null
          id?: string
          name?: string
          region?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          away_score: number | null
          away_team: string
          commence_time: string
          created_at: string
          external_id: string | null
          home_score: number | null
          home_team: string
          id: string
          league: string | null
          sport: string
          status: string
          updated_at: string
        }
        Insert: {
          away_score?: number | null
          away_team: string
          commence_time: string
          created_at?: string
          external_id?: string | null
          home_score?: number | null
          home_team: string
          id?: string
          league?: string | null
          sport: string
          status?: string
          updated_at?: string
        }
        Update: {
          away_score?: number | null
          away_team?: string
          commence_time?: string
          created_at?: string
          external_id?: string | null
          home_score?: number | null
          home_team?: string
          id?: string
          league?: string | null
          sport?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          alert_id: string | null
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      odds_snapshots: {
        Row: {
          bookmaker_id: string | null
          bookmaker_key: string | null
          captured_at: string
          external_match_id: string | null
          id: string
          market: string
          match_id: string | null
          odd: number
          selection: string
        }
        Insert: {
          bookmaker_id?: string | null
          bookmaker_key?: string | null
          captured_at?: string
          external_match_id?: string | null
          id?: string
          market: string
          match_id?: string | null
          odd: number
          selection: string
        }
        Update: {
          bookmaker_id?: string | null
          bookmaker_key?: string | null
          captured_at?: string
          external_match_id?: string | null
          id?: string
          market?: string
          match_id?: string | null
          odd?: number
          selection?: string
        }
        Relationships: [
          {
            foreignKeyName: "odds_snapshots_bookmaker_id_fkey"
            columns: ["bookmaker_id"]
            isOneToOne: false
            referencedRelation: "bookmakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "odds_snapshots_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          display_name: string | null
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          display_name?: string | null
          id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          display_name?: string | null
          id?: string
          timezone?: string
          updated_at?: string
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
    }
    Enums: {
      app_role: "admin" | "user"
      bet_status: "pending" | "won" | "lost" | "void" | "cashout"
      bet_type: "single" | "parlay" | "system"
      txn_type:
        | "deposit"
        | "withdraw"
        | "adjustment"
        | "bet_stake"
        | "bet_payout"
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
      app_role: ["admin", "user"],
      bet_status: ["pending", "won", "lost", "void", "cashout"],
      bet_type: ["single", "parlay", "system"],
      txn_type: [
        "deposit",
        "withdraw",
        "adjustment",
        "bet_stake",
        "bet_payout",
      ],
    },
  },
} as const
