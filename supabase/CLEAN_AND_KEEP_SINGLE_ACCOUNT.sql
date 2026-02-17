-- ============================================================
-- تنظيف كامل للقاعدة + الإبقاء على حساب واحد فقط
-- CLEAN ALL TABLES AND KEEP ONLY ACCOUNT: 0080255d-cbd7-48a0-86e6-60dfa4172881
-- ============================================================
-- نفّذ هذا الملف في Supabase SQL Editor (كاملًا).
-- 
-- ⚠️ مهم: بعد تشغيل هذا السكريبت:
-- 1. اذهب إلى Supabase Dashboard → Authentication → Users
-- 2. احذف جميع المستخدمين ما عدا: 0080255d-cbd7-48a0-86e6-60dfa4172881
-- 3. إذا ظهر خطأ "Database error deleting user":
--    - تأكد أن السكريبت تم تشغيله بنجاح (profiles تم حذفها)
--    - جرب حذف مستخدم واحد في كل مرة
--    - أو استخدم ملف DELETE_USERS_SAFE.sql أولاً
-- ============================================================

DO $$
BEGIN
  -- 1) حذف الجداول التي تعتمد على غيرها (ترتيب FK)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investment_returns') THEN
    TRUNCATE TABLE public.investment_returns CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investments') THEN
    TRUNCATE TABLE public.investments CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_direct_purchases') THEN
    TRUNCATE TABLE public.project_direct_purchases CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'balance_requests') THEN
    TRUNCATE TABLE public.balance_requests CASCADE;
  END IF;

  TRUNCATE TABLE public.housing_applications CASCADE;

  -- 2) إلغاء ربط المشاريع بالمستخدمين (لتمكين حذف الملفات لاحقًا)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    UPDATE public.projects SET created_by = NULL WHERE created_by IS NOT NULL;
  END IF;

  -- تفريغ جدول المشاريع (اختياري — احذف السطر التالي إذا أردت الإبقاء على بيانات المشاريع)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    TRUNCATE TABLE public.projects CASCADE;
  END IF;

  -- 3) حذف كل الملفات (profiles) ما عدا الحساب المطلوب
  DELETE FROM public.profiles
  WHERE id <> '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid;

  -- 4) إنشاء/تحديث الملف للحساب الوحيد (يجب أن يكون رقم الهاتف غير فارغ)
  INSERT INTO public.profiles (
    id,
    role,
    phone_number,
    email,
    cin,
    country,
    city
  ) VALUES (
    '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid,
    'admin'::user_role,
    '+21600000000',
    'owner@gmail.com',
    NULL,
    'Tunisia',
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    phone_number = COALESCE(public.profiles.phone_number, EXCLUDED.phone_number),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    country = COALESCE(EXCLUDED.country, public.profiles.country),
    city = EXCLUDED.city,
    updated_at = TIMEZONE('utc', NOW());

END $$;

-- عرض النتيجة
SELECT
  'تم التنظيف والإبقاء على الحساب المحدد فقط' AS message,
  (SELECT COUNT(*) FROM public.profiles) AS profiles_count,
  (SELECT COUNT(*) FROM public.housing_applications) AS housing_applications_count,
  (SELECT COUNT(*) FROM public.projects) AS projects_count;

SELECT id, role, phone_number, email, country, city
FROM public.profiles
WHERE id = '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid;
