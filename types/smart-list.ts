import type { ContactFilter } from "./filter";
import type { Contact } from "./contact";

// ---------------------------------------------------------------------------
// Source types — mirrors the database check constraint on app_smart_lists
// ---------------------------------------------------------------------------

/** How the list's contacts are resolved. */
export type SmartListSourceType =
  | "local_manual"   // contacts pinned in app_smart_list_contacts
  | "local_dynamic"  // contacts resolved at send-time from filter_rules
  | "ghl_imported";  // reserved for future GHL smart-list sync

// ---------------------------------------------------------------------------
// app_smart_lists row
// ---------------------------------------------------------------------------

/** Full row shape returned by the API. */
export interface AppSmartList {
  id: string;
  created_at: string;
  updated_at: string;
  connection_id: string;
  account_label: string | null;
  name: string;
  description: string | null;
  source_type: SmartListSourceType;
  ghl_list_id: string | null;
  /** Populated when source_type = 'local_dynamic'. */
  filter_rules: ContactFilter | null;
  search_query: string | null;
  cached_contact_count: number;
  last_refreshed_at: string | null;
  is_archived: boolean;
}

/** Lightweight list shape used in index/list responses (no filter_rules). */
export type AppSmartListSummary = Pick<
  AppSmartList,
  | "id"
  | "created_at"
  | "updated_at"
  | "name"
  | "description"
  | "source_type"
  | "cached_contact_count"
  | "last_refreshed_at"
  | "is_archived"
>;

// ---------------------------------------------------------------------------
// app_smart_list_contacts row
// ---------------------------------------------------------------------------

export interface AppSmartListContact {
  id: string;
  created_at: string;
  smart_list_id: string;
  connection_id: string;
  contact_id: string;
  /** Point-in-time Contact snapshot. May be null if not yet fetched. */
  contact_snapshot: Contact | null;
}

// ---------------------------------------------------------------------------
// API payload shapes (used by the API routes and calling components)
// ---------------------------------------------------------------------------

/** Body for POST /api/app-smart-lists (create manual list). */
export interface CreateManualSmartListPayload {
  name: string;
  description?: string;
  contacts: Contact[];
}

/** Body for POST /api/app-smart-lists (create dynamic list). */
export interface CreateDynamicSmartListPayload {
  name: string;
  description?: string;
  filter_rules: ContactFilter;
  search_query?: string;
}

/** Body for PATCH /api/app-smart-lists/[id]. */
export interface UpdateSmartListPayload {
  name?: string;
  description?: string;
  /** Dynamic lists only: replace the stored filter definition. */
  filter_rules?: ContactFilter;
  search_query?: string;
}

/** Response shape from GET /api/app-smart-lists. */
export interface SmartListsResponse {
  smartLists: AppSmartListSummary[];
}

/** Response shape from GET /api/app-smart-lists/[id]/contacts. */
export interface SmartListContactsResponse {
  contacts: Contact[];
  total: number;
  /** True when contacts were resolved live from filter_rules rather than the snapshot. */
  resolved_live: boolean;
}
