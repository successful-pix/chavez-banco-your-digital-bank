export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      kyc_documents: {
        Row: { created_at: string; doc_type: string; id: string; notes: string | null; status: string; storage_path: string; updated_at: string; user_id: string }
        Insert: { created_at?: string; doc_type: string; id?: string; notes?: string | null; status?: string; storage_path: string; updated_at?: string; user_id: string }
        Update: { created_at?: string; doc_type?: string; id?: string; notes?: string | null; status?: string; storage_path?: string; updated_at?: string; user_id?: string }
        Relationships: []
      }
      notifications: {
        Row: { body: string | null; created_at: string; id: string; read: boolean; title: string; user_id: string }
        Insert: { body?: string | null; created_at?: string; id?: string; read?: boolean; title: string; user_id: string }
        Update: { body?: string | null; created_at?: string; id?: string; read?: boolean; title?: string; user_id?: string }
        Relationships: []
      }
      profiles: {
        Row: { id: string; full_name: string; email: string | null; phone: string | null; cpf: string | null; date_of_birth: string | null; avatar_url: string | null; agencia: string; account_number: string; pix_key: string | null; balance: number; kyc_status: string; face_verified: boolean; language: string; country: string; currency: string; swift: string; account_type: string; created_at: string; updated_at: string; blocked: boolean }
        Insert: { id: string; full_name?: string; email?: string | null; phone?: string | null; cpf?: string | null; date_of_birth?: string | null; avatar_url?: string | null; agencia?: string; account_number: string; pix_key?: string | null; balance?: number; kyc_status?: string; face_verified?: boolean; language?: string; country?: string; currency?: string; swift?: string; account_type?: string; created_at?: string; updated_at?: string; blocked?: boolean }
        Update: { id?: string; full_name?: string; email?: string | null; phone?: string | null; cpf?: string | null; date_of_birth?: string | null; avatar_url?: string | null; agencia?: string; account_number?: string; pix_key?: string | null; balance?: number; kyc_status?: string; face_verified?: boolean; language?: string; country?: string; currency?: string; swift?: string; account_type?: string; created_at?: string; updated_at?: string; blocked?: boolean }
        Relationships: []
      }
      support_messages: {
        Row: { id: string; user_id: string; from_admin: boolean; subject: string | null; body: string; image_url: string | null; status: string; priority: string; read_by_admin: boolean; created_at: string }
        Insert: { id?: string; user_id: string; from_admin?: boolean; subject?: string | null; body: string; image_url?: string | null; status?: string; priority?: string; read_by_admin?: boolean; created_at?: string }
        Update: { id?: string; user_id?: string; from_admin?: boolean; subject?: string | null; body?: string; image_url?: string | null; status?: string; priority?: string; read_by_admin?: boolean; created_at?: string }
        Relationships: []
      }
      transactions: {
        Row: { id: string; user_id: string; type: string; direction: string; amount: number; status: string; reference: string; description: string | null; sender_name: string | null; sender_account: string | null; sender_bank: string | null; recipient_name: string | null; recipient_account: string | null; recipient_bank: string | null; recipient_agencia: string | null; pix_key: string | null; approved_by: string | null; approved_at: string | null; rejection_reason: string | null; created_at: string }
        Insert: { id?: string; user_id: string; type: string; direction: string; amount: number; status?: string; reference?: string; description?: string | null; sender_name?: string | null; sender_account?: string | null; sender_bank?: string | null; recipient_name?: string | null; recipient_account?: string | null; recipient_bank?: string | null; recipient_agencia?: string | null; pix_key?: string | null; approved_by?: string | null; approved_at?: string | null; rejection_reason?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; type?: string; direction?: string; amount?: number; status?: string; reference?: string; description?: string | null; sender_name?: string | null; sender_account?: string | null; sender_bank?: string | null; recipient_name?: string | null; recipient_account?: string | null; recipient_bank?: string | null; recipient_agencia?: string | null; pix_key?: string | null; approved_by?: string | null; approved_at?: string | null; rejection_reason?: string | null; created_at?: string }
        Relationships: []
      }
      user_roles: {
        Row: { created_at: string; id: string; role: Database["public"]["Enums"]["app_role"]; user_id: string }
        Insert: { created_at?: string; id?: string; role?: Database["public"]["Enums"]["app_role"]; user_id: string }
        Update: { created_at?: string; id?: string; role?: Database["public"]["Enums"]["app_role"]; user_id?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      has_role: { Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }; Returns: boolean }
      admin_assert_role: { Args: Record<string, never>; Returns: undefined }
      admin_list_users: { Args: Record<string, never>; Returns: Database["public"]["Tables"]["profiles"]["Row"][] }
      admin_list_roles: { Args: Record<string, never>; Returns: Database["public"]["Tables"]["user_roles"]["Row"][] }
      admin_list_kyc: { Args: Record<string, never>; Returns: Database["public"]["Tables"]["kyc_documents"]["Row"][] }
      admin_list_transactions: { Args: Record<string, never>; Returns: Database["public"]["Tables"]["transactions"]["Row"][] }
      admin_list_notifications: { Args: Record<string, never>; Returns: Database["public"]["Tables"]["notifications"]["Row"][] }
      admin_list_support: { Args: Record<string, never>; Returns: Database["public"]["Tables"]["support_messages"]["Row"][] }
      admin_list_support_profiles: { Args: Record<string, never>; Returns: Database["public"]["Tables"]["profiles"]["Row"][] }
      admin_list_pending_transfers: { Args: Record<string, never>; Returns: Database["public"]["Tables"]["transactions"]["Row"][] }
    }
    Enums: { app_role: "admin" | "user" }
    CompositeTypes: { [_ in never]: never }
  }
}
