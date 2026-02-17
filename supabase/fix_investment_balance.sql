-- Fix investment balance calculation
-- This script will recalculate balances based on actual investment statuses
-- Run this in Supabase SQL Editor

-- First, reset all balances to 0 (or their current balance from balance_requests)
UPDATE public.profiles
SET balance = COALESCE((
  SELECT SUM(amount)
  FROM public.balance_requests
  WHERE balance_requests.investor_id = profiles.id
    AND balance_requests.status = 'approved'
), 0);

-- Then deduct for all non-rejected investments
UPDATE public.profiles
SET balance = balance - COALESCE((
  SELECT SUM(investment_amount)
  FROM public.investments
  WHERE investments.investor_id = profiles.id
    AND investments.status != 'rejected'
), 0);

-- Verify the calculation
SELECT 
  p.id,
  p.email,
  p.phone_number,
  p.balance as current_balance,
  COALESCE((
    SELECT SUM(br.amount)
    FROM public.balance_requests br
    WHERE br.investor_id = p.id AND br.status = 'approved'
  ), 0) as total_approved_requests,
  COALESCE((
    SELECT SUM(i.investment_amount)
    FROM public.investments i
    WHERE i.investor_id = p.id AND i.status != 'rejected'
  ), 0) as total_active_investments,
  COALESCE((
    SELECT SUM(br.amount)
    FROM public.balance_requests br
    WHERE br.investor_id = p.id AND br.status = 'approved'
  ), 0) - COALESCE((
    SELECT SUM(i.investment_amount)
    FROM public.investments i
    WHERE i.investor_id = p.id AND i.status != 'rejected'
  ), 0) as calculated_balance
FROM public.profiles p
WHERE p.role = 'investor'
ORDER BY p.created_at DESC;
