import type { ContactFilter } from "./filter";

export type CampaignStatus = "pending" | "running" | "completed" | "failed";

export type RecipientStatus = "pending" | "sent" | "failed" | "skipped";

/**
 * How the recipient list was built.
 * Stored in bulk_send_campaigns.selection_mode.
 */
export type SelectionMode = "manual" | "filter" | "smart_list";

// ---------------------------------------------------------------------------
// bulk_send_campaigns row
// ---------------------------------------------------------------------------

export interface BulkSendCampaign {
  id: string;
  created_at: string;
  connection_id: string;
  account_label: string;
  message_type: string;
  /** Raw message template (may contain {{variables}}). */
  message: string;
  /** Explicit template column — same value as message for new rows. */
  message_template: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: CampaignStatus;
  /** Legacy: GHL smart-list ID string (old flow). */
  smart_list_id: string | null;
  /** Legacy: GHL smart-list name string (old flow). */
  smart_list_name: string | null;
  /** Legacy: flat array of GHL contact IDs. */
  contact_ids: string[] | null;
  completed_at: string | null;
  // ---- New columns added in Phase 1 migration ----
  selection_mode: SelectionMode | null;
  filter_rules: ContactFilter | null;
  search_query: string | null;
  /** FK to app_smart_lists when selection_mode = 'smart_list'. */
  smart_list_uuid: string | null;
}

// ---------------------------------------------------------------------------
// bulk_send_recipients row
// ---------------------------------------------------------------------------

export interface BulkSendRecipient {
  id: string;
  created_at: string;
  campaign_id: string;
  connection_id: string | null;
  contact_id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  message_type: string;
  /** Final message after {{variable}} expansion for this specific contact. */
  rendered_message: string | null;
  status: RecipientStatus;
  error_message: string | null;
  sent_at: string | null;
  skipped_reason: string | null;
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

export interface CampaignRecipientsResponse {
  recipients: BulkSendRecipient[];
  total: number;
  page: number;
  limit: number;
}
