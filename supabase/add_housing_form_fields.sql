-- ============================================================
-- إضافة حقول جديدة لاستمارة السكن
-- ============================================================

-- إضافة حقل المهارات
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS skills TEXT;

-- إضافة حقول نوع السكن والتفاصيل
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS housing_type_model TEXT; -- APARTMENT, VILLA, etc.
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS housing_individual_collective TEXT; -- فردي / جماعي
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS housing_area TEXT; -- 60, 80, 100, custom
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS housing_area_custom INTEGER; -- Custom area value
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS desired_total_area TEXT; -- المساحة الجملية المرغوبة
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS number_of_rooms TEXT; -- عدد الغرف المطلوبة
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS additional_components JSONB DEFAULT '[]'::jsonb; -- مكونات إضافية مرغوبة
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS housing_purpose TEXT; -- الهدف من السكن

-- إضافة حقول طريقة الدفع والتقسيط
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS payment_type TEXT; -- تقسيط / دفع كامل
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS payment_percentage DECIMAL(5, 2); -- النسبة المدفوعة (1%-100%)
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS installment_period TEXT; -- 5, 10, 15, 20, 25 سنوات

-- إضافة حقول المعلومات الإضافية
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS additional_info_type TEXT; -- نص / صوت
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS additional_info_voice_url TEXT; -- رابط التسجيل الصوتي

-- ملاحظة: حقل additional_info موجود بالفعل في الجدول
