export interface GHLConnection {
  id: string;
  created_at: string;
  account_label: string;
  location_id: string;
  company_id: string | null;
  user_id_ghl: string | null;
  email: string | null;
  token_expires_at: string;
  is_active: boolean;
  last_used_at: string | null;
}
