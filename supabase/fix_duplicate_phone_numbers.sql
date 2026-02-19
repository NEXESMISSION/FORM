-- Fix duplicate phone_number in profiles so no two rows match.
-- Run this in Supabase SQL Editor to resolve 409 Conflict on profile upsert.
-- Duplicates get a suffix so each profile has a unique phone_number.

WITH duplicates AS (
  SELECT id, phone_number,
         ROW_NUMBER() OVER (PARTITION BY phone_number ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.profiles
)
UPDATE public.profiles p
SET phone_number = d.phone_number || '-' || SUBSTRING(d.id::text, 1, 8)
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;

-- Verify (should return 0 rows):
-- SELECT phone_number, COUNT(*) FROM public.profiles GROUP BY phone_number HAVING COUNT(*) > 1;
