-- Reset all investor balances and recalculate correctly
-- Run this in Supabase SQL Editor

-- Step 1: Reset all investor balances to 0
UPDATE public.profiles
SET balance = 0
WHERE role = 'investor';

-- Step 2: Add all approved balance requests
UPDATE public.profiles
SET balance = balance + COALESCE((
  SELECT SUM(amount)
  FROM public.balance_requests
  WHERE balance_requests.investor_id = profiles.id
    AND balance_requests.status = 'approved'
), 0)
WHERE role = 'investor';

-- Step 3: Subtract all non-rejected investments
UPDATE public.profiles
SET balance = balance - COALESCE((
  SELECT SUM(investment_amount)
  FROM public.investments
  WHERE investments.investor_id = profiles.id
    AND investments.status != 'rejected'
), 0)
WHERE role = 'investor';

-- Step 4: Verify the results
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
  ), 0) as calculated_balance,
  CASE 
    WHEN p.balance = (
      COALESCE((
        SELECT SUM(br.amount)
        FROM public.balance_requests br
        WHERE br.investor_id = p.id AND br.status = 'approved'
      ), 0) - COALESCE((
        SELECT SUM(i.investment_amount)
        FROM public.investments i
        WHERE i.investor_id = p.id AND i.status != 'rejected'
      ), 0)
    ) THEN '✓ Correct'
    ELSE '✗ Mismatch'
  END as status
FROM public.profiles p
WHERE p.role = 'investor'
ORDER BY p.created_at DESC;
