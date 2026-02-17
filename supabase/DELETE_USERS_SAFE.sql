-- ============================================================
-- حذف آمن للمستخدمين — Safe User Deletion Script
-- ============================================================
-- هذا السكريبت يحذف المستخدمين من public.profiles أولاً
-- ثم يمكنك حذفهم من auth.users عبر لوحة Supabase أو السكريبت أدناه
-- ============================================================

-- 1) حذف كل الملفات (profiles) ما عدا الحساب المطلوب
-- هذا سيعمل بدون مشاكل لأننا نحذف من public.profiles فقط
DELETE FROM public.profiles
WHERE id <> '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid;

-- عرض المستخدمين المتبقين في profiles
SELECT 
  'Profiles remaining' AS status,
  COUNT(*) AS count
FROM public.profiles;

SELECT id, role, email, phone_number
FROM public.profiles;

-- ============================================================
-- 2) حذف المستخدمين من auth.users (يتطلب صلاحيات خاصة)
-- ============================================================
-- ملاحظة: حذف من auth.users يتطلب استخدام Service Role Key
-- أو يمكنك حذفهم يدوياً من لوحة Supabase → Authentication → Users
-- 
-- إذا كنت تريد حذفهم عبر SQL، استخدم هذا السكريبت مع Service Role:

/*
-- احذف المستخدمين من auth.users (ما عدا الحساب المطلوب)
-- تحذير: هذا يتطلب صلاحيات Service Role
DELETE FROM auth.users
WHERE id <> '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid
AND id NOT IN (SELECT id FROM public.profiles);
*/

-- ============================================================
-- 3) طريقة بديلة: استخدام Supabase Dashboard
-- ============================================================
-- 1. اذهب إلى Supabase Dashboard → Authentication → Users
-- 2. حدد المستخدمين الذين تريد حذفهم (ما عدا 0080255d-cbd7-48a0-86e6-60dfa4172881)
-- 3. اضغط Delete
-- 4. إذا ظهر خطأ، تأكد أنك حذفتهم من public.profiles أولاً (السكريبت أعلاه)
-- 5. ثم حاول الحذف من auth.users مرة أخرى

-- ============================================================
-- 4) التحقق من النتيجة
-- ============================================================
SELECT 
  'Total profiles' AS metric,
  COUNT(*) AS value
FROM public.profiles
UNION ALL
SELECT 
  'Target account exists' AS metric,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid
  ) THEN 1 ELSE 0 END AS value;
