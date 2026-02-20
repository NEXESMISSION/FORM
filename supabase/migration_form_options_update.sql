-- ============================================================
-- تحديث خيارات الاستمارة (نوع السكن، مكونات إضافية، الهدف من السكن)
-- Run this if you already have housing_applications with the extended form fields.
-- ============================================================

-- 1) Schema: ensure columns exist (idempotent; safe if already applied)
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS housing_type_model TEXT;
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS additional_components JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS housing_purpose TEXT;

-- 2) Data: normalize existing additional_components
--    - Replace "حديقة صغيرة" with "حديقة"
--    - Remove "شرفة"
-- Only updates rows that actually contain these values.
UPDATE public.housing_applications
SET additional_components = (
  SELECT COALESCE(
    jsonb_agg(
      CASE WHEN elem = 'حديقة صغيرة' THEN 'حديقة' ELSE elem END
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements_text(additional_components) AS elem
  WHERE elem <> 'شرفة'
)
WHERE additional_components @> '["حديقة صغيرة"]'::jsonb
   OR additional_components @> '["شرفة"]'::jsonb;

-- Note: housing_type_model and housing_purpose are free TEXT;
-- new values (شقة، مسكن فردي متقل، فيلا، مسكن ثاني، etc.) require no DB change.
