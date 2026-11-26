-- Step 3A (teams): run AFTER `python -m scripts.create_tables` has created team, team_member and team_item.
-- Row level security with no policies blocks Supabase's public API; the backend's own connection is unaffected.
alter table public.team enable row level security;
alter table public.team_member enable row level security;
alter table public.team_item enable row level security;
