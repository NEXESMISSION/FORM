-- Add progress tracking fields for approved applications
-- Allows tracking project progress after application is approved

ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS progress_stage TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  ADD COLUMN IF NOT EXISTS progress_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS progress_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.housing_applications.progress_stage IS 'مرحلة التقدم: دراسة، تصميم، بناء، تشطيب، جاهز';
COMMENT ON COLUMN public.housing_applications.progress_percentage IS 'نسبة الإنجاز (0-100)';
COMMENT ON COLUMN public.housing_applications.progress_notes IS 'ملاحظات حول التقدم (يراها المتقدم)';
COMMENT ON COLUMN public.housing_applications.progress_updated_at IS 'آخر تحديث للتقدم (يُحدّث عند كل تحديث من الإدارة)';
