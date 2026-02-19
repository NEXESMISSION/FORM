-- ============================================================
-- Clean All Data for User: saifelleuchi127@gmail.com
-- ============================================================
-- This script removes ALL data associated with the user account
-- but KEEPS the user account itself (profiles and auth.users)
-- ============================================================

-- Step 1: Get the user ID
DO $$
DECLARE
  target_user_id UUID;
  deleted_count INTEGER;
BEGIN
  -- Find user ID by email
  SELECT id INTO target_user_id
  FROM public.profiles
  WHERE email = 'saifelleuchi127@gmail.com';
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User not found with email: saifelleuchi127@gmail.com';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found user ID: %', target_user_id;
  
  -- Step 2: Delete investment returns (must delete before investments)
  DELETE FROM public.investment_returns
  WHERE investment_id IN (
    SELECT id FROM public.investments WHERE investor_id = target_user_id
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % investment returns', deleted_count;
  
  -- Step 3: Delete investments
  DELETE FROM public.investments
  WHERE investor_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % investments', deleted_count;
  
  -- Step 4: Delete balance requests
  DELETE FROM public.balance_requests
  WHERE investor_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % balance requests', deleted_count;
  
  -- Step 5: Delete project direct purchases
  DELETE FROM public.project_direct_purchases
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % direct purchases', deleted_count;
  
  -- Step 6: Delete housing applications
  DELETE FROM public.housing_applications
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % housing applications', deleted_count;
  
  -- Step 7: Reset user balance to 0 (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'balance'
  ) THEN
    UPDATE public.profiles
    SET balance = 0.00
    WHERE id = target_user_id;
    RAISE NOTICE 'Reset user balance to 0';
  ELSE
    RAISE NOTICE 'Balance column does not exist, skipping balance reset';
  END IF;
  
  -- Step 8: Clear profile optional fields (keep required ones)
  -- Only update columns that exist
  UPDATE public.profiles
  SET 
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = target_user_id;
  
  -- Clear optional fields if they exist (using dynamic SQL)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'cin') THEN
    UPDATE public.profiles SET cin = NULL WHERE id = target_user_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'city') THEN
    UPDATE public.profiles SET city = NULL WHERE id = target_user_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'governorate') THEN
    UPDATE public.profiles SET governorate = NULL WHERE id = target_user_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name') THEN
    UPDATE public.profiles SET name = NULL WHERE id = target_user_id;
  END IF;
  
  RAISE NOTICE 'Cleared optional profile fields';
  
  RAISE NOTICE 'Data cleaning completed for user: %', target_user_id;
END $$;

-- ============================================================
-- Verification: Check what data remains
-- ============================================================
SELECT 
  'User Account' AS data_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE email = 'saifelleuchi127@gmail.com')
    THEN 'EXISTS ✓'
    ELSE 'NOT FOUND'
  END AS status
UNION ALL
SELECT 
  'Housing Applications' AS data_type,
  COUNT(*)::TEXT AS status
FROM public.housing_applications ha
JOIN public.profiles p ON ha.user_id = p.id
WHERE p.email = 'saifelleuchi127@gmail.com'
UNION ALL
SELECT 
  'Direct Purchases' AS data_type,
  COUNT(*)::TEXT AS status
FROM public.project_direct_purchases pdp
JOIN public.profiles p ON pdp.user_id = p.id
WHERE p.email = 'saifelleuchi127@gmail.com'
UNION ALL
SELECT 
  'Investments' AS data_type,
  COUNT(*)::TEXT AS status
FROM public.investments inv
JOIN public.profiles p ON inv.investor_id = p.id
WHERE p.email = 'saifelleuchi127@gmail.com'
UNION ALL
SELECT 
  'Balance Requests' AS data_type,
  COUNT(*)::TEXT AS status
FROM public.balance_requests br
JOIN public.profiles p ON br.investor_id = p.id
WHERE p.email = 'saifelleuchi127@gmail.com';

-- ============================================================
-- Optional: Clean Storage Files
-- ============================================================
-- Note: Storage cleanup requires additional permissions
-- You can manually delete files from Supabase Dashboard:
-- Storage → documents → housing-documents/{user_id}/
-- Storage → documents → purchase-documents/{user_id}/
-- 
-- Or use this SQL (requires storage admin permissions):
/*
DELETE FROM storage.objects
WHERE bucket_id = 'documents'
AND (
  name LIKE 'housing-documents/' || (SELECT id::TEXT FROM public.profiles WHERE email = 'saifelleuchi127@gmail.com') || '/%'
  OR name LIKE 'purchase-documents/' || (SELECT id::TEXT FROM public.profiles WHERE email = 'saifelleuchi127@gmail.com') || '/%'
);
*/
