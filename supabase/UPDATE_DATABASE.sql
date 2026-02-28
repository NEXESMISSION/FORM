-- ============================================================
-- تحديث قاعدة البيانات — Domobat
-- Run this in Supabase SQL Editor (one-time or when adding features).
-- Safe to run multiple times (idempotent).
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1) PROFILES — حقول الملف الشخصي (تسجيل: الاسم، الهاتف، CIN، الولاية)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS governorate TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cin TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Tunisia';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_seen_intro BOOLEAN DEFAULT false;

UPDATE public.profiles SET country = 'Tunisia' WHERE country IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_has_seen_intro ON public.profiles(has_seen_intro);

-- ---------------------------------------------------------------------------
-- 2) PROJECTS — حقول الاستمارة، الصور، التواريخ
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS purchase_form_fields JSONB DEFAULT '["full_name","phone","cin","email","notes"]'::jsonb;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS purchase_required_documents JSONB DEFAULT '["نسخة بطاقة التعريف","شهادة دخل أو عدم دخل"]'::jsonb;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS start_date DATE;

COMMENT ON COLUMN public.projects.image_urls IS 'مصفوفة روابط صور المشروع';
COMMENT ON COLUMN public.projects.start_date IS 'تاريخ بدء المشروع';
COMMENT ON COLUMN public.projects.video_urls IS 'مصفوفة معرفات فيديو يوتيوب (Video ID أو رابط كامل)';

-- ---------------------------------------------------------------------------
-- 3) PROJECT_DIRECT_PURCHASES — جدول طلبات الشراء المباشر (إن لم يكن موجوداً)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_direct_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, project_id)
);

ALTER TABLE public.project_direct_purchases
  ADD COLUMN IF NOT EXISTS form_data JSONB;
ALTER TABLE public.project_direct_purchases
  ADD COLUMN IF NOT EXISTS documents_note TEXT;
ALTER TABLE public.project_direct_purchases
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.project_direct_purchases
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.project_direct_purchases
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());
ALTER TABLE public.project_direct_purchases
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'full';

COMMENT ON COLUMN public.project_direct_purchases.payment_type IS 'طريقة الدفع: full = بالحاضر، installment = بالتقسيط';

ALTER TABLE public.project_direct_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own direct purchases" ON public.project_direct_purchases;
CREATE POLICY "Users can view own direct purchases"
  ON public.project_direct_purchases FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create direct purchase request" ON public.project_direct_purchases;
CREATE POLICY "Users can create direct purchase request"
  ON public.project_direct_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own direct purchases" ON public.project_direct_purchases;
CREATE POLICY "Users can update own direct purchases"
  ON public.project_direct_purchases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all direct purchases" ON public.project_direct_purchases;
CREATE POLICY "Admins can view all direct purchases"
  ON public.project_direct_purchases FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update direct purchases" ON public.project_direct_purchases;
CREATE POLICY "Admins can update direct purchases"
  ON public.project_direct_purchases FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 5) HOUSING_APPLICATIONS — طلب مستندات + مستندات المتقدم + ربط بطلب الشراء
--    (after project_direct_purchases exists)
-- ---------------------------------------------------------------------------
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS documents_requested_message TEXT;
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS applicant_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS direct_purchase_id UUID REFERENCES public.project_direct_purchases(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Users can update own application" ON public.housing_applications;
CREATE POLICY "Users can update own application"
  ON public.housing_applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add FK on direct_purchase_id if column exists but constraint is missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'housing_applications' AND column_name = 'direct_purchase_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'housing_applications' AND constraint_name = 'housing_applications_direct_purchase_id_fkey')
  THEN
    ALTER TABLE public.housing_applications
      ADD CONSTRAINT housing_applications_direct_purchase_id_fkey
      FOREIGN KEY (direct_purchase_id) REFERENCES public.project_direct_purchases(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- انتهى التحديث
-- ملخص: profiles (name, governorate, cin, has_seen_intro, …),
--       projects (purchase_form_fields, purchase_required_documents, thumbnail_url, image_urls, start_date),
--       project_direct_purchases (جدول + form_data, documents, payment_type, RLS),
--       housing_applications (documents_requested_message, applicant_documents, direct_purchase_id).
-- ============================================================
