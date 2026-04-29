-- Phase 1: smart lists, smart list contacts, bulk send recipients
-- All changes are additive / backward-compatible with existing rows.
-- Safe to run against a live database.

-- ---------------------------------------------------------------------------
-- 1. app_smart_lists
--    One row = one list scoped to a GHL connection.
--    source_type controls how contacts are resolved:
--      'local_manual'  – contacts are pinned in app_smart_list_contacts
--      'local_dynamic' – contacts are derived at send-time from filter_rules
--      'ghl_imported'  – reserved for a future GHL smart-list import feature
-- ---------------------------------------------------------------------------
create table if not exists app_smart_lists (
  id                   uuid        primary key default gen_random_uuid(),
  created_at           timestamptz not null    default now(),
  updated_at           timestamptz not null    default now(),
  connection_id        uuid        not null    references ghl_connections(id) on delete cascade,
  account_label        text,
  name                 text        not null,
  description          text,
  source_type          text        not null
                         check (source_type in ('local_dynamic', 'local_manual', 'ghl_imported')),
  ghl_list_id          text,
  -- filter_rules stores a ContactFilter JSON object (see types/filter.ts).
  -- Populated for 'local_dynamic'; null for 'local_manual'.
  filter_rules         jsonb,
  -- search_query is a convenience top-level text search stored alongside
  -- filter_rules so the dynamic resolver can pass it to GHL natively.
  search_query         text,
  cached_contact_count integer     not null    default 0,
  last_refreshed_at    timestamptz,
  is_archived          boolean     not null    default false
);

comment on column app_smart_lists.filter_rules is
  'ContactFilter JSON (types/filter.ts). Non-null when source_type = local_dynamic.';

comment on column app_smart_lists.ghl_list_id is
  'GHL smart-list identifier. Non-null when source_type = ghl_imported.';

-- Keep updated_at current automatically.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger app_smart_lists_updated_at
  before update on app_smart_lists
  for each row execute function set_updated_at();

-- Fast look-ups by connection and by archive status.
create index if not exists idx_app_smart_lists_connection_id
  on app_smart_lists(connection_id);

create index if not exists idx_app_smart_lists_connection_archived
  on app_smart_lists(connection_id, is_archived);


-- ---------------------------------------------------------------------------
-- 2. app_smart_list_contacts
--    Junction table that pins individual contacts to a manual smart list.
--    contact_snapshot holds a point-in-time copy of the GHL contact so
--    the list can be composed and previewed without hitting the GHL API.
--    Dynamic lists do NOT write rows here; they resolve at send-time.
-- ---------------------------------------------------------------------------
create table if not exists app_smart_list_contacts (
  id                uuid        primary key default gen_random_uuid(),
  created_at        timestamptz not null    default now(),
  smart_list_id     uuid        not null    references app_smart_lists(id) on delete cascade,
  connection_id     uuid        not null    references ghl_connections(id) on delete cascade,
  contact_id        text        not null,
  -- contact_snapshot stores the Contact shape from types/contact.ts.
  -- Nullable: if null the contact must be fetched live from GHL.
  contact_snapshot  jsonb,

  unique (smart_list_id, contact_id)
);

comment on column app_smart_list_contacts.contact_snapshot is
  'Point-in-time Contact object (types/contact.ts). May be stale; used for display only.';

create index if not exists idx_app_smart_list_contacts_smart_list_id
  on app_smart_list_contacts(smart_list_id);

create index if not exists idx_app_smart_list_contacts_connection_id
  on app_smart_list_contacts(connection_id);


-- ---------------------------------------------------------------------------
-- 3. bulk_send_recipients
--    One row per contact per campaign send.
--    status flow: pending → sent | failed | skipped
--    rendered_message holds the final message after variable substitution.
-- ---------------------------------------------------------------------------
create table if not exists bulk_send_recipients (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null    default now(),
  campaign_id      uuid        not null    references bulk_send_campaigns(id) on delete cascade,
  connection_id    uuid                    references ghl_connections(id) on delete set null,
  contact_id       text        not null,
  contact_name     text,
  contact_email    text,
  contact_phone    text,
  message_type     text        not null,
  -- rendered_message is the final text after {{variable}} substitution.
  rendered_message text,
  status           text        not null    default 'pending'
                     check (status in ('pending', 'sent', 'failed', 'skipped')),
  error_message    text,
  sent_at          timestamptz,
  skipped_reason   text
);

comment on column bulk_send_recipients.rendered_message is
  'Final message text after personalization variables are expanded.';

comment on column bulk_send_recipients.skipped_reason is
  'Human-readable reason when status = skipped (e.g. "no phone number").';

create index if not exists idx_bulk_send_recipients_campaign_id
  on bulk_send_recipients(campaign_id);

create index if not exists idx_bulk_send_recipients_campaign_status
  on bulk_send_recipients(campaign_id, status);

create index if not exists idx_bulk_send_recipients_contact_id
  on bulk_send_recipients(contact_id);


-- ---------------------------------------------------------------------------
-- 4. bulk_send_campaigns — additive columns (all nullable, no defaults break
--    existing rows)
-- ---------------------------------------------------------------------------

-- How recipients were chosen: 'manual' | 'filter' | 'smart_list'
alter table bulk_send_campaigns
  add column if not exists selection_mode text;

-- Snapshot of the ContactFilter used when selection_mode = 'filter'.
alter table bulk_send_campaigns
  add column if not exists filter_rules jsonb;

-- Text search component of the filter (mirrors app_smart_lists.search_query).
alter table bulk_send_campaigns
  add column if not exists search_query text;

-- FK to app_smart_lists when selection_mode = 'smart_list'.
alter table bulk_send_campaigns
  add column if not exists smart_list_uuid uuid
    references app_smart_lists(id) on delete set null;

-- Original message template before {{variable}} expansion.
-- The existing 'message' column stores the raw template going forward;
-- this column is kept for explicit documentation / legacy disambiguation.
alter table bulk_send_campaigns
  add column if not exists message_template text;

comment on column bulk_send_campaigns.selection_mode is
  'How recipients were chosen: manual | filter | smart_list';

comment on column bulk_send_campaigns.filter_rules is
  'ContactFilter JSON snapshot used when selection_mode = filter.';

comment on column bulk_send_campaigns.smart_list_uuid is
  'FK to app_smart_lists. Non-null when selection_mode = smart_list.';

comment on column bulk_send_campaigns.message_template is
  'Original template with {{variables}} before per-contact expansion.';
