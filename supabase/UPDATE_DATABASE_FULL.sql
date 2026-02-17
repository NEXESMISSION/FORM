-- ============================================================
-- تحديث قاعدة البيانات — Domobat / برنامج السكن الاقتصادي السريع
-- نفّذ هذا الملف في Supabase SQL Editor أو عبر migration
-- ============================================================

-- 0) إضافة حقول لجدول profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS governorate TEXT;

-- ملاحظة: حقل city موجود بالفعل في الجدول، لكننا نستخدم governorate فقط الآن

-- 1) إضافة أعمدة طلب المستندات والمستندات المرفوعة من المتقدم
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS documents_requested_message TEXT;
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS applicant_documents JSONB DEFAULT '[]'::jsonb;

-- 1b) السماح للمتقدم بتحديث طلبه (مثلاً إرفاق المستندات)
DROP POLICY IF EXISTS "Users can update own application" ON public.housing_applications;
CREATE POLICY "Users can update own application"
  ON public.housing_applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) المشاريع: حقول استمارة طلب الشراء + الوثائق المطلوبة (حسب المشروع)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS purchase_form_fields JSONB DEFAULT '["full_name","phone","cin","email","notes"]'::jsonb;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS purchase_required_documents JSONB DEFAULT '["نسخة بطاقة التعريف","شهادة دخل أو عدم دخل"]'::jsonb;

-- 3) جدول طلبات الشراء المباشر (إن لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS public.project_direct_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, project_id)
);

-- إضافة أعمدة تفاصيل الطلب إن لم تكن موجودة
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

-- تفعيل Row Level Security
ALTER TABLE public.project_direct_purchases ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان (RLS Policies)
DROP POLICY IF EXISTS "Users can view own direct purchases" ON public.project_direct_purchases;
CREATE POLICY "Users can view own direct purchases"
  ON public.project_direct_purchases FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create direct purchase request" ON public.project_direct_purchases;
CREATE POLICY "Users can create direct purchase request"
  ON public.project_direct_purchases FOR INSERT
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

-- ============================================================
-- ملخص التحديثات:
-- 1. profiles.name، profiles.governorate
-- 2. housing_applications.documents_requested_message، applicant_documents (JSONB)
-- 3. سياسة "Users can update own application" لتمكين إرفاق المستندات من المتقدم
-- 4. projects.purchase_form_fields، purchase_required_documents
-- 5. project_direct_purchases: form_data، documents_note، documents
-- ============================================================

-- انتهى التحديث
