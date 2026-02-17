-- Reset all database data EXCEPT accounts and projects
-- This will delete all applications, investments, balance requests, etc.
-- But KEEPS user accounts (profiles) and projects
-- Run this in Supabase SQL Editor

BEGIN;

-- Step 1: Delete all balance requests FIRST (to avoid foreign key issues)
DELETE FROM public.balance_requests;

-- Step 2: Delete all investment returns (depends on investments)
DELETE FROM public.investment_returns;

-- Step 3: Delete all investments
DELETE FROM public.investments;

-- Step 4: Delete all housing applications
DELETE FROM public.housing_applications;

-- Step 5: Reset all investor balances to 0
UPDATE public.profiles
SET balance = 0
WHERE role = 'investor';

COMMIT;

-- Verification: Show what remains
SELECT 
  'profiles' as table_name,
  COUNT(*) as record_count,
  'KEPT - All user accounts' as status
FROM public.profiles
UNION ALL
SELECT 
  'projects' as table_name,
  COUNT(*) as record_count,
  'KEPT - All projects' as status
FROM public.projects
UNION ALL
SELECT 
  'housing_applications' as table_name,
  COUNT(*) as record_count,
  'DELETED' as status
FROM public.housing_applications
UNION ALL
SELECT 
  'investments' as table_name,
  COUNT(*) as record_count,
  'DELETED' as status
FROM public.investments
UNION ALL
SELECT 
  'investment_returns' as table_name,
  COUNT(*) as record_count,
  'DELETED' as status
FROM public.investment_returns
UNION ALL
SELECT 
  'balance_requests' as table_name,
  COUNT(*) as record_count,
  'DELETED' as status
FROM public.balance_requests;

-- After running, you should see:
-- profiles: (number of accounts) - KEPT
-- projects: (number of projects) - KEPT
-- housing_applications: 0 - DELETED
-- investments: 0 - DELETED
-- investment_returns: 0 - DELETED
-- balance_requests: 0 - DELETED
