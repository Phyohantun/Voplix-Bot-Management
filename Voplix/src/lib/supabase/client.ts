import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type SupabaseClient = ReturnType<typeof createClient>;
export type Database = {
  public: {
    Tables: {
      bots: {
        Row: {
          id: string;
          user_id: string;
          token_encrypted: string;
          token_hash: string;
          bot_username: string;
          webhook_set: boolean;
          is_active: boolean;
          start_welcome_message: string | null;
          start_show_menu_only: boolean;
          start_show_tip: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<{
          id: string;
          user_id: string;
          token_encrypted: string;
          token_hash: string;
          bot_username: string;
          webhook_set: boolean;
          is_active: boolean;
          start_welcome_message: string | null;
          start_show_menu_only: boolean;
          start_show_tip: boolean;
          created_at: string;
          updated_at: string;
        }, 'id' | 'created_at' | 'updated_at'> & Partial<{ id: string; created_at: string; updated_at: string }>;
        Update: Partial<{
          id: string;
          user_id: string;
          token_encrypted: string;
          token_hash: string;
          bot_username: string;
          webhook_set: boolean;
          is_active: boolean;
          start_welcome_message: string | null;
          start_show_menu_only: boolean;
          start_show_tip: boolean;
          created_at: string;
          updated_at: string;
        }>;
      };
      menu_items: {
        Row: {
          id: string;
          bot_id: string;
          name: string;
          price: number;
          type: 'DIGITAL_DELIVERY' | 'MANUAL_DELIVERY' | 'MESSAGE_ONLY';
          delivery_content: string | null;
          stock_count: number;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: any;
        Update: any;
      };
      stock_items: {
        Row: {
          id: string;
          menu_item_id: string;
          content_text: string;
          is_sold: boolean;
          sold_at: string | null;
          order_id: string | null;
          created_at: string;
        };
        Insert: any;
        Update: any;
      };
      orders: {
        Row: {
          id: string;
          bot_id: string;
          menu_item_id: string;
          telegram_user_id: string;
          telegram_username: string | null;
          status: 'PENDING_PAYMENT' | 'SLIP_SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
          slip_image_url: string | null;
          manual_delivery_data: Record<string, string> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: any;
        Update: any;
      };
      telegram_users: {
        Row: {
          id: string;
          bot_id: string;
          telegram_user_id: string;
          telegram_username: string | null;
          first_seen: string;
          last_seen: string;
          created_at: string;
          updated_at: string;
        };
        Insert: any;
        Update: any;
      };
      broadcast_logs: {
        Row: {
          id: string;
          bot_id: string;
          message: string;
          image_url: string | null;
          target_type: 'ALL' | 'PAID_ONLY';
          sent_count: number;
          failed_count: number;
          created_at: string;
        };
        Insert: any;
        Update: any;
      };
      owner_profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          business_name: string | null;
          avatar_data_url: string | null;
          notification_last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: any;
        Update: any;
      };
      system_announcements: {
        Row: {
          id: string;
          title: string;
          message: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: any;
        Update: any;
      };
      user_states: {
        Row: {
          id: string;
          telegram_user_id: string;
          bot_id: string;
          state: 'IDLE' | 'VIEWING_MENU' | 'WAITING_FOR_SLIP' | 'CONFIRMING_ORDER';
          order_id: string | null;
          menu_item_id: string | null;
          updated_at: string;
        };
        Insert: any;
        Update: any;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};
