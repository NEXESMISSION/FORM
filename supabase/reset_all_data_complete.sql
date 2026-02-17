-- COMPLETE RESET - Delete all data except accounts and projects
-- Run this in Supabase SQL Editor
-- After running, refresh your browser to see the changes

-- Disable triggers temporarily to avoid issues
SET session_replication_role = 'replica';

BEGIN;

-- Delete in correct order to avoid foreign key violations

-- 1. Delete investment returns (references investments)
TRUNCATE TABLE public.investment_returns CASCADE;

-- 2. Delete investments (references projects and profiles)
TRUNCATE TABLE public.investments CASCADE;

-- 3. Delete balance requests (references profiles)
TRUNCATE TABLE public.balance_requests CASCADE;

-- 4. Delete housing applications (references profiles)
TRUNCATE TABLE public.housing_applications CASCADE;

-- 5. Reset all investor balances to 0
UPDATE public.profiles
SET balance = 0
WHERE role = 'investor';

COMMIT;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Show results
SELECT 
  '✅ RESET COMPLETE' as message,
  (SELECT COUNT(*) FROM public.profiles) as accounts_kept,
  (SELECT COUNT(*) FROM public.projects) as projects_kept,
  (SELECT COUNT(*) FROM public.housing_applications) as applications_deleted,
  (SELECT COUNT(*) FROM public.investments) as investments_deleted,
  (SELECT COUNT(*) FROM public.balance_requests) as balance_requests_deleted;
