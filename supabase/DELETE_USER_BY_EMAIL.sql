-- ============================================================
-- حذف مستخدم محدد بالبريد الإلكتروني — Delete User by Email
-- ============================================================
-- هذا السكريبت يحذف المستخدم الذي لديه البريد الإلكتروني: saifelleuchi127@gmail.com
-- من public.profiles أولاً ثم من auth.users
-- ============================================================

-- 1) البحث عن المستخدم في profiles
SELECT 
  id,
  email,
  phone_number,
  role,
  created_at
FROM public.profiles
WHERE email = 'saifelleuchi127@gmail.com';

-- 2) حذف المستخدم من public.profiles (سيحذف تلقائياً السجلات المرتبطة بسبب CASCADE)
DELETE FROM public.profiles
WHERE email = 'saifelleuchi127@gmail.com';

-- 3) التحقق من الحذف
SELECT 
  'User deleted from profiles' AS status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE email = 'saifelleuchi127@gmail.com')
    THEN 'FAILED - User still exists'
    ELSE 'SUCCESS - User deleted'
  END AS result;

-- ============================================================
-- 4) حذف المستخدم من auth.users (يتطلب صلاحيات Service Role)
-- ============================================================
-- ملاحظة: حذف من auth.users يتطلب استخدام Service Role Key
-- أو يمكنك حذفه يدوياً من لوحة Supabase → Authentication → Users
-- 
-- إذا كنت تريد حذفه عبر SQL، استخدم هذا السكريبت مع Service Role:

/*
-- احذف المستخدم من auth.users بالبريد الإلكتروني
-- تحذير: هذا يتطلب صلاحيات Service Role
DELETE FROM auth.users
WHERE email = 'saifelleuchi127@gmail.com';
*/

-- ============================================================
-- 5) طريقة بديلة: استخدام Supabase Dashboard
-- ============================================================
-- 1. اذهب إلى Supabase Dashboard → Authentication → Users
-- 2. ابحث عن المستخدم بالبريد الإلكتروني: saifelleuchi127@gmail.com
-- 3. اضغط Delete
-- 4. إذا ظهر خطأ، تأكد أنك حذفته من public.profiles أولاً (السكريبت أعلاه)
-- 5. ثم حاول الحذف من auth.users مرة أخرى

-- ============================================================
-- 6) التحقق النهائي
-- ============================================================
SELECT 
  'User exists in profiles' AS check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE email = 'saifelleuchi127@gmail.com')
    THEN 'YES - Still exists'
    ELSE 'NO - Deleted'
  END AS result
UNION ALL
SELECT 
  'User exists in auth.users' AS check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'saifelleuchi127@gmail.com')
    THEN 'YES - Still exists'
    ELSE 'NO - Deleted'
  END AS result;
