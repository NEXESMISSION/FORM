-- Add progress tracking for direct purchases (same as housing: stage, %, notes, updated_at)
-- So applicants can track their purchase request after approval

ALTER TABLE public.project_direct_purchases
  ADD COLUMN IF NOT EXISTS progress_stage TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  ADD COLUMN IF NOT EXISTS progress_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS progress_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.project_direct_purchases.progress_stage IS 'مرحلة التقدم: دراسة، تصميم، بناء، تشطيب، جاهز';
COMMENT ON COLUMN public.project_direct_purchases.progress_percentage IS 'نسبة الإنجاز (0-100)';
COMMENT ON COLUMN public.project_direct_purchases.progress_notes IS 'ملاحظات حول التقدم (يراها المستخدم)';
COMMENT ON COLUMN public.project_direct_purchases.progress_updated_at IS 'آخر تحديث للتقدم';
