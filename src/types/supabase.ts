export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string | null;
          end_date: string | null;
          id: number;
          payment_status: string | null;
          pickup_time: string | null;
          return_time: string | null;
          start_date: string | null;
          status: string | null;
          total_amount: number | null;
          user_id: string | null;
          vehicle_id: number | null;
        };
        Insert: {
          created_at?: string | null;
          end_date?: string | null;
          id?: number;
          payment_status?: string | null;
          pickup_time?: string | null;
          return_time?: string | null;
          start_date?: string | null;
          status?: string | null;
          total_amount?: number | null;
          user_id?: string | null;
          vehicle_id?: number | null;
        };
        Update: {
          created_at?: string | null;
          end_date?: string | null;
          id?: number;
          payment_status?: string | null;
          pickup_time?: string | null;
          return_time?: string | null;
          start_date?: string | null;
          status?: string | null;
          total_amount?: number | null;
          user_id?: string | null;
          vehicle_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cars: {
        Row: {
          car_image_url: string | null;
          category: string | null;
          color: string | null;
          created_at: string | null;
          daily_rate: number | null;
          fuel_type: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean | null;
          is_suspended: boolean | null;
          license_plate: string | null;
          make: string;
          mileage: number | null;
          model: string;
          pajak_expiry: string | null;
          seats: number | null;
          status: string | null;
          stnk_expiry: string | null;
          stnk_image_url: string | null;
          stnk_url: string | null;
          tax_expiry: string | null;
          transmission: string | null;
          year: number;
        };
        Insert: {
          car_image_url?: string | null;
          category?: string | null;
          color?: string | null;
          created_at?: string | null;
          daily_rate?: number | null;
          fuel_type?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          is_suspended?: boolean | null;
          license_plate?: string | null;
          make: string;
          mileage?: number | null;
          model: string;
          pajak_expiry?: string | null;
          seats?: number | null;
          status?: string | null;
          stnk_expiry?: string | null;
          stnk_image_url?: string | null;
          stnk_url?: string | null;
          tax_expiry?: string | null;
          transmission?: string | null;
          year: number;
        };
        Update: {
          car_image_url?: string | null;
          category?: string | null;
          color?: string | null;
          created_at?: string | null;
          daily_rate?: number | null;
          fuel_type?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          is_suspended?: boolean | null;
          license_plate?: string | null;
          make?: string;
          mileage?: number | null;
          model?: string;
          pajak_expiry?: string | null;
          seats?: number | null;
          status?: string | null;
          stnk_expiry?: string | null;
          stnk_image_url?: string | null;
          stnk_url?: string | null;
          tax_expiry?: string | null;
          transmission?: string | null;
          year?: number;
        };
        Relationships: [];
      };
      chart_of_accounts: {
        Row: {
          account_code: string;
          account_name: string;
          account_type: string;
          balance_total: number | null;
          created_at: string;
          credit_total: number | null;
          current_balance: number | null;
          debit_total: number | null;
          description: string | null;
          id: string;
          is_header: boolean | null;
          normal_balance: string | null;
          parent_id: string | null;
          total_credit: number | null;
          total_debit: number | null;
          updated_at: string;
        };
        Insert: {
          account_code: string;
          account_name: string;
          account_type: string;
          balance_total?: number | null;
          created_at?: string;
          credit_total?: number | null;
          current_balance?: number | null;
          debit_total?: number | null;
          description?: string | null;
          id?: string;
          is_header?: boolean | null;
          normal_balance?: string | null;
          parent_id?: string | null;
          total_credit?: number | null;
          total_debit?: number | null;
          updated_at?: string;
        };
        Update: {
          account_code?: string;
          account_name?: string;
          account_type?: string;
          balance_total?: number | null;
          created_at?: string;
          credit_total?: number | null;
          current_balance?: number | null;
          debit_total?: number | null;
          description?: string | null;
          id?: string;
          is_header?: boolean | null;
          normal_balance?: string | null;
          parent_id?: string | null;
          total_credit?: number | null;
          total_debit?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "chart_of_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_items: {
        Row: {
          category: string | null;
          created_at: string | null;
          damage_value: number;
          description: string | null;
          id: number;
          item_name: string;
          updated_at: string | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string | null;
          damage_value?: number;
          description?: string | null;
          id?: number;
          item_name: string;
          updated_at?: string | null;
        };
        Update: {
          category?: string | null;
          created_at?: string | null;
          damage_value?: number;
          description?: string | null;
          id?: number;
          item_name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          address: string | null;
          created_at: string | null;
          email: string | null;
          id: string;
          ktp_paspor_url: string | null;
          name: string;
          phone: string | null;
          role: string | null;
          selfie_url: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          ktp_paspor_url?: string | null;
          name: string;
          phone?: string | null;
          role?: string | null;
          selfie_url?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          ktp_paspor_url?: string | null;
          name?: string;
          phone?: string | null;
          role?: string | null;
          selfie_url?: string | null;
        };
        Relationships: [];
      };
      damages_checklist: {
        Row: {
          id: number;
          item_name: string;
          damage_value: number;
          category: string | null;
          description: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          item_name: string;
          damage_value: number;
          category?: string | null;
          description?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          item_name?: string;
          damage_value?: number;
          category?: string | null;
          description?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      drivers: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string;
          kk_url: string | null;
          license_expiry: string | null;
          license_number: string | null;
          name: string;
          phone: string | null;
          reference_phone: number | null;
          selfie_url: string | null;
          sim_url: string | null;
          status: string | null;
          stnk_expiry: string | null;
          stnk_url: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          kk_url?: string | null;
          license_expiry?: string | null;
          license_number?: string | null;
          name: string;
          phone?: string | null;
          reference_phone?: number | null;
          selfie_url?: string | null;
          sim_url?: string | null;
          status?: string | null;
          stnk_expiry?: string | null;
          stnk_url?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          kk_url?: string | null;
          license_expiry?: string | null;
          license_number?: string | null;
          name?: string;
          phone?: string | null;
          reference_phone?: number | null;
          selfie_url?: string | null;
          sim_url?: string | null;
          status?: string | null;
          stnk_expiry?: string | null;
          stnk_url?: string | null;
        };
        Relationships: [];
      };
      general_ledger: {
        Row: {
          account_code: string | null;
          account_id: string;
          account_name: string | null;
          account_type: string | null;
          balance: number | null;
          created_at: string;
          credit: number | null;
          date: string;
          debit: number | null;
          description: string | null;
          id: string;
          is_manual_entry: string | null;
          journal_entry_id: string | null;
          manual_entry: boolean | null;
          running_balance: number;
          total_debit: number | null;
          updated_at: string;
        };
        Insert: {
          account_code?: string | null;
          account_id: string;
          account_name?: string | null;
          account_type?: string | null;
          balance?: number | null;
          created_at?: string;
          credit?: number | null;
          date: string;
          debit?: number | null;
          description?: string | null;
          id?: string;
          is_manual_entry?: string | null;
          journal_entry_id?: string | null;
          manual_entry?: boolean | null;
          running_balance?: number;
          total_debit?: number | null;
          updated_at?: string;
        };
        Update: {
          account_code?: string | null;
          account_id?: string;
          account_name?: string | null;
          account_type?: string | null;
          balance?: number | null;
          created_at?: string;
          credit?: number | null;
          date?: string;
          debit?: number | null;
          description?: string | null;
          id?: string;
          is_manual_entry?: string | null;
          journal_entry_id?: string | null;
          manual_entry?: boolean | null;
          running_balance?: number;
          total_debit?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "general_ledger_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "chart_of_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "general_ledger_journal_entry_id_fkey";
            columns: ["journal_entry_id"];
            isOneToOne: false;
            referencedRelation: "journal_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      inspections: {
        Row: {
          booking_id: number | null;
          condition_notes: string | null;
          created_at: string | null;
          id: number;
          inspection_type: string | null;
          photo_urls: Json | null;
          user_id: string | null;
        };
        Insert: {
          booking_id?: number | null;
          condition_notes?: string | null;
          created_at?: string | null;
          id?: number;
          inspection_type?: string | null;
          photo_urls?: Json | null;
          user_id?: string | null;
        };
        Update: {
          booking_id?: number | null;
          condition_notes?: string | null;
          created_at?: string | null;
          id?: number;
          inspection_type?: string | null;
          photo_urls?: Json | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inspections_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      journal_entries: {
        Row: {
          account_id: string | null;
          balance_total: number | null;
          created_at: string;
          date: string;
          description: string;
          id: string;
          total_debit: number | null;
          updated_at: string;
        };
        Insert: {
          account_id?: string | null;
          balance_total?: number | null;
          created_at?: string;
          date: string;
          description: string;
          id?: string;
          total_debit?: number | null;
          updated_at?: string;
        };
        Update: {
          account_id?: string | null;
          balance_total?: number | null;
          created_at?: string;
          date?: string;
          description?: string;
          id?: string;
          total_debit?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      journal_entry_items: {
        Row: {
          account_id: string;
          created_at: string;
          credit: number | null;
          debit: number | null;
          id: string;
          journal_entry_id: string;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          credit?: number | null;
          debit?: number | null;
          id?: string;
          journal_entry_id: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          credit?: number | null;
          debit?: number | null;
          id?: string;
          journal_entry_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journal_entry_items_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "chart_of_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_entry_items_journal_entry_id_fkey";
            columns: ["journal_entry_id"];
            isOneToOne: false;
            referencedRelation: "journal_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number | null;
          booking_id: number | null;
          created_at: string | null;
          id: number;
          payment_method: string | null;
          status: string | null;
          transaction_id: string | null;
          user_id: string | null;
          damage_id: number | null;
          is_damage_payment: boolean | null;
          bank_name: string | null;
          is_partial_payment: boolean | null;
        };
        Insert: {
          amount?: number | null;
          booking_id?: number | null;
          created_at?: string | null;
          id?: number;
          payment_method?: string | null;
          status?: string | null;
          transaction_id?: string | null;
          user_id?: string | null;
          damage_id?: number | null;
          is_damage_payment?: boolean | null;
          bank_name?: string | null;
          is_partial_payment?: boolean | null;
        };
        Update: {
          amount?: number | null;
          booking_id?: number | null;
          created_at?: string | null;
          id?: number;
          payment_method?: string | null;
          status?: string | null;
          transaction_id?: string | null;
          user_id?: string | null;
          damage_id?: number | null;
          is_damage_payment?: boolean | null;
          bank_name?: string | null;
          is_partial_payment?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          id: number;
          name: string | null;
          role_name: string;
        };
        Insert: {
          id?: number;
          name?: string | null;
          role_name: string;
        };
        Update: {
          id?: number;
          name?: string | null;
          role_name?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          phone_number: string | null;
          role: string | null;
          role_id: number | null;
          selfie_url: string | null;
          user_roles: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          phone_number?: string | null;
          role?: string | null;
          role_id?: number | null;
          selfie_url?: string | null;
          user_roles?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          phone_number?: string | null;
          role?: string | null;
          role_id?: number | null;
          selfie_url?: string | null;
          user_roles?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          available: boolean | null;
          category: string | null;
          created_at: string | null;
          features: Json | null;
          fuel_type: string | null;
          id: number;
          image: string | null;
          license_plate: string | null;
          make: string;
          model: string;
          price: number;
          seats: number | null;
          transmission: string | null;
          type: string | null;
          updated_at: string | null;
          year: number | null;
        };
        Insert: {
          available?: boolean | null;
          category?: string | null;
          created_at?: string | null;
          features?: Json | null;
          fuel_type?: string | null;
          id?: number;
          image?: string | null;
          license_plate?: string | null;
          make: string;
          model: string;
          price: number;
          seats?: number | null;
          transmission?: string | null;
          type?: string | null;
          updated_at?: string | null;
          year?: number | null;
        };
        Update: {
          available?: boolean | null;
          category?: string | null;
          created_at?: string | null;
          features?: Json | null;
          fuel_type?: string | null;
          id?: number;
          image?: string | null;
          license_plate?: string | null;
          make?: string;
          model?: string;
          price?: number;
          seats?: number | null;
          transmission?: string | null;
          type?: string | null;
          updated_at?: string | null;
          year?: number | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_tables: {
        Args: Record<PropertyKey, never>;
        Returns: {
          table_name: string;
        }[];
      };
      process_journal_entry: {
        Args:
          | { p_journal_entry_id: string }
          | {
              _account_code: string;
              _total_debit: number;
              _total_credit: number;
              _description: string;
            };
        Returns: boolean;
      };
      update_all_account_totals: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
