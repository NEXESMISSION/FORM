-- Reset balance for a specific investor by email
-- Replace 'investor@example.com' with the actual email

-- Option 1: Reset specific investor by email
UPDATE public.profiles
SET balance = 0
WHERE email = 'investor@example.com' AND role = 'investor';

-- Add approved balance requests
UPDATE public.profiles
SET balance = balance + COALESCE((
  SELECT SUM(amount)
  FROM public.balance_requests
  WHERE balance_requests.investor_id = profiles.id
    AND balance_requests.status = 'approved'
), 0)
WHERE email = 'investor@example.com' AND role = 'investor';

-- Subtract non-rejected investments
UPDATE public.profiles
SET balance = balance - COALESCE((
  SELECT SUM(investment_amount)
  FROM public.investments
  WHERE investments.investor_id = profiles.id
    AND investments.status != 'rejected'
), 0)
WHERE email = 'investor@example.com' AND role = 'investor';

-- Verify the result
SELECT 
  p.email,
  p.balance as current_balance,
  COALESCE((
    SELECT SUM(br.amount)
    FROM public.balance_requests br
    WHERE br.investor_id = p.id AND br.status = 'approved'
  ), 0) as approved_requests,
  COALESCE((
    SELECT SUM(i.investment_amount)
    FROM public.investments i
    WHERE i.investor_id = p.id AND i.status != 'rejected'
  ), 0) as active_investments
FROM public.profiles p
WHERE p.email = 'investor@example.com' AND p.role = 'investor';
