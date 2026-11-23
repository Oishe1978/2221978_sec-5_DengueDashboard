-- Step 1 (authentication hardening): run once in the Supabase SQL Editor.
-- The project creates tables with SQLModel (create_all), which never changes a table that already exists,
-- so the new columns of app_user are added by hand here.

-- PART A: run BEFORE starting the new backend
alter table public.app_user
  add column if not exists failed_login_count integer not null default 0,
  add column if not exists locked_until timestamp,
  add column if not exists last_login_at timestamp,
  add column if not exists banned_at timestamp,
  add column if not exists ban_reason varchar(300);

-- PART B: run AFTER `python -m scripts.create_tables` has created user_session and audit_log.
-- Row level security with no policies blocks Supabase's public API; the backend's own connection is unaffected.
alter table public.user_session enable row level security;
alter table public.audit_log enable row level security;
