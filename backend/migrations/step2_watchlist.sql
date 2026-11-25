-- Step 2 (RBAC and watchlist): run AFTER `python -m scripts.create_tables` has created the watch_item table.
-- Row level security with no policies blocks Supabase's public API; the backend's own connection is unaffected.

