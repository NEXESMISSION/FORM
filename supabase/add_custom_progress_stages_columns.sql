-- مراحل تقدم مخصصة لكل طلب أو لكل مشروع (للعملاء الذين يريدون مساراً مختلفاً بالكامل)
-- Run in Supabase SQL Editor. Safe on existing DB.

-- للطلبات: مراحل مخصصة لهذا الطلب فقط (مصفوفة نصوص)
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS custom_progress_stages JSONB DEFAULT NULL;

COMMENT ON COLUMN public.housing_applications.custom_progress_stages IS 'مراحل تقدم مخصصة لهذا الطلب فقط. مصفوفة نصوص مثل ["تأسيس", "هيكلة", "تشطيب"]. إن وُجدت تُستخدم بدل المراحل العامة.';

-- للمشاريع: مراحل تقدم مخصصة لطلبات الشراء المباشر لهذا المشروع
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS custom_progress_stages JSONB DEFAULT NULL;

COMMENT ON COLUMN public.projects.custom_progress_stages IS 'مراحل تقدم مخصصة لمشروع هذا الشراء. مصفوفة نصوص. إن وُجدت تُستخدم عند تحديث التقدم لطلبات الشراء التابعة له.';
