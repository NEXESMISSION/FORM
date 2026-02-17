-- ============================================================
-- دالة لحذف المستخدمين بشكل آمن
-- Function to Safely Delete Users
-- ============================================================
-- هذا السكريبت ينشئ دالة يمكن استدعاؤها لحذف مستخدم معين
-- This script creates a function that can be called to delete a specific user
-- ============================================================

-- إنشاء دالة لحذف مستخدم (يتطلب SECURITY DEFINER)
CREATE OR REPLACE FUNCTION delete_user_safely(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1) حذف من public.profiles أولاً
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  
  -- 2) حذف من auth.users
  -- ملاحظة: هذا يتطلب صلاحيات خاصة وقد لا يعمل من SQL Editor العادي
  -- DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RAISE NOTICE 'Deleted profile for user: %', user_id_to_delete;
END;
$$;

-- استخدام الدالة لحذف جميع المستخدمين ما عدا الحساب المطلوب
-- Use the function to delete all users except the target account
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM public.profiles 
    WHERE id <> '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid
  LOOP
    PERFORM delete_user_safely(user_record.id);
  END LOOP;
END $$;

-- عرض النتيجة
SELECT 
  'Users deleted successfully' AS message,
  (SELECT COUNT(*) FROM public.profiles) AS remaining_profiles;
