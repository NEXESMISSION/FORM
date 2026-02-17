-- SAFE VERSION: Reset all data EXCEPT accounts and projects
-- This version shows what will be deleted before actually deleting
-- Run this in Supabase SQL Editor

-- First, show what will be deleted (for verification)
SELECT 
  'BEFORE RESET - Current Data Counts' as info,
  (SELECT COUNT(*) FROM public.profiles) as profiles_count,
  (SELECT COUNT(*) FROM public.projects) as projects_count,
  (SELECT COUNT(*) FROM public.housing_applications) as applications_count,
  (SELECT COUNT(*) FROM public.investments) as investments_count,
  (SELECT COUNT(*) FROM public.investment_returns) as returns_count,
  (SELECT COUNT(*) FROM public.balance_requests) as balance_requests_count;

-- Uncomment the section below to actually perform the reset
/*
BEGIN;

-- Reset all investor balances to 0
UPDATE public.profiles
SET balance = 0
WHERE role = 'investor';

-- Delete all housing applications
DELETE FROM public.housing_applications;

-- Delete all investments
DELETE FROM public.investments;

-- Delete all investment returns
DELETE FROM public.investment_returns;

-- Delete all balance requests
DELETE FROM public.balance_requests;

COMMIT;

-- Verification after reset
SELECT 
  'AFTER RESET - Remaining Data Counts' as info,
  (SELECT COUNT(*) FROM public.profiles) as profiles_count,
  (SELECT COUNT(*) FROM public.projects) as projects_count,
  (SELECT COUNT(*) FROM public.housing_applications) as applications_count,
  (SELECT COUNT(*) FROM public.investments) as investments_count,
  (SELECT COUNT(*) FROM public.investment_returns) as returns_count,
  (SELECT COUNT(*) FROM public.balance_requests) as balance_requests_count;
*/
