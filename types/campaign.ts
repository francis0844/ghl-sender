export type CampaignStatus = "pending" | "running" | "completed" | "failed";

export interface BulkSendCampaign {
  id: string;
  created_at: string;
  connection_id: string;
  account_label: string;
  message_type: string;
  message: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: CampaignStatus;
  smart_list_id: string | null;
  smart_list_name: string | null;
  contact_ids: string[] | null;
  completed_at: string | null;
}
