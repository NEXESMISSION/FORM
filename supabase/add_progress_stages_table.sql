-- جدول مراحل التقدم: مراحل جاهزة (roadmap) + مراحل مخصصة (يقوم الأدمن بإضافتها وتعديلها)
-- Run in Supabase SQL Editor. Safe to run on existing DB (adds table + default stages).

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS public.progress_stages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  value TEXT UNIQUE,
  label_ar TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_system BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

COMMENT ON TABLE public.progress_stages IS 'مراحل التقدم: القياسية (دراسة، تصميم، بناء، تشطيب، جاهز) + مراحل مخصصة';
COMMENT ON COLUMN public.progress_stages.value IS 'للمراحل القياسية: study, design, ...؛ للمخصصة: NULL (يُخزّن label_ar في progress_stage)';
COMMENT ON COLUMN public.progress_stages.is_system IS 'true = مرحلة افتراضية لا تُحذف';

-- RLS
ALTER TABLE public.progress_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read progress stages" ON public.progress_stages;
CREATE POLICY "Anyone can read progress stages"
  ON public.progress_stages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage progress stages" ON public.progress_stages;
CREATE POLICY "Admins can manage progress stages"
  ON public.progress_stages FOR ALL
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- إدراج المراحل الافتراضية (roadmap)
INSERT INTO public.progress_stages (value, label_ar, sort_order, is_system) VALUES
  ('study', 'دراسة المشروع', 1, true),
  ('design', 'التصميم', 2, true),
  ('construction', 'البناء', 3, true),
  ('finishing', 'التشطيب', 4, true),
  ('ready', 'جاهز للتسليم', 5, true)
ON CONFLICT (value) DO NOTHING;
