-- ============================================================
-- Clear database, keep only owner@gmail.com
-- ============================================================
-- Run in Supabase SQL Editor (Dashboard → SQL Editor).
-- Removes all data and all users except the one with email = 'owner@gmail.com'.
--
-- If owner@gmail.com is not in public.profiles, all profiles and all auth users
-- are removed (full wipe).
--
-- If "DELETE FROM auth.users" fails (permission), delete other users manually:
-- Dashboard → Authentication → Users → delete everyone except owner@gmail.com.
--
-- Storage: Uploaded files (documents bucket) are not deleted. Clear them in
-- Dashboard → Storage if needed.
-- ============================================================

DO $$
DECLARE
  owner_id UUID;
BEGIN
  -- Resolve owner: must exist in public.profiles with email = 'owner@gmail.com'
  SELECT id INTO owner_id
  FROM public.profiles
  WHERE LOWER(TRIM(email)) = 'owner@gmail.com'
  LIMIT 1;

  IF owner_id IS NULL THEN
    RAISE NOTICE 'No profile with email owner@gmail.com found. Will clear all data and all profiles.';
  ELSE
    RAISE NOTICE 'Keeping profile (and auth user) with id: %', owner_id;
  END IF;

  -- 1) Child tables (order respects FKs)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investment_returns') THEN
    TRUNCATE TABLE public.investment_returns CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investments') THEN
    TRUNCATE TABLE public.investments CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'balance_requests') THEN
    TRUNCATE TABLE public.balance_requests CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_direct_purchases') THEN
    TRUNCATE TABLE public.project_direct_purchases CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'housing_applications') THEN
    TRUNCATE TABLE public.housing_applications CASCADE;
  END IF;

  -- 2) Unlink projects from users, then clear projects
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    UPDATE public.projects SET created_by = NULL WHERE created_by IS NOT NULL;
    TRUNCATE TABLE public.projects CASCADE;
  END IF;

  -- 3) Delete all profiles except owner
  IF owner_id IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id <> owner_id;
  ELSE
    TRUNCATE TABLE public.profiles CASCADE;
  END IF;

  -- 4) Delete all auth users except owner (requires DB role that can write to auth schema)
  IF owner_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id <> owner_id;
  ELSE
    -- No owner profile: delete all auth users (dangerous; only if you really want full wipe)
    DELETE FROM auth.users;
  END IF;

END $$;

-- Summary
SELECT
  'Done. Only owner@gmail.com kept (if it existed).' AS message,
  (SELECT COUNT(*) FROM public.profiles) AS profiles_left,
  (SELECT COUNT(*) FROM auth.users) AS auth_users_left;

SELECT id, role, email, phone_number
FROM public.profiles;
