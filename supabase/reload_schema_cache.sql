-- If you get 400 Bad Request on project_direct_purchases (or other tables)
-- after adding columns or tables, PostgREST may be using a stale schema cache.
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → Run).

NOTIFY pgrst, 'reload schema';

-- Then retry the request from the app. If 400 persists, check Dashboard → Logs → API
-- for the exact PostgREST error (e.g. PGRST100 = query parse error).
