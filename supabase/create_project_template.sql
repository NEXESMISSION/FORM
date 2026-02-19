-- ============================================================
-- SQL Template: Create a New Project
-- Run this in Supabase SQL Editor
-- Replace the values below with your project details
-- ============================================================

INSERT INTO public.projects (
  name,
  description,
  location_lat,
  location_lng,
  governorate,
  district,
  housing_type,
  number_of_units,
  expected_price,
  completion_percentage,
  delivery_date,
  start_date,
  status,
  land_cost,
  construction_cost,
  total_cost,
  project_duration_months,
  expected_return_percentage,
  risk_level,
  study_pdf_url,
  thumbnail_url,
  purchase_form_fields,
  purchase_required_documents,
  created_by
) VALUES (
  'اسم المشروع',                    -- name: اسم المشروع (مطلوب)
  'وصف المشروع هنا...',             -- description: وصف المشروع (اختياري)
  36.8065,                          -- location_lat: خط العرض (اختياري)
  10.1815,                          -- location_lng: خط الطول (اختياري)
  'تونس',                           -- governorate: الولاية (مطلوب)
  'المنزه',                         -- district: المعتمدية/المنطقة (مطلوب)
  'apartment',                      -- housing_type: 'apartment' أو 'individual' (مطلوب)
  120,                              -- number_of_units: عدد الوحدات (مطلوب)
  180000.00,                        -- expected_price: السعر المتوقع (اختياري)
  0,                                -- completion_percentage: نسبة الإنجاز 0-100 (افتراضي: 0)
  NULL,                             -- delivery_date: تاريخ التسليم المتوقع (اختياري) - مثال: '2026-12-31'::date
  NULL,                             -- start_date: تاريخ البدء (اختياري) - مثال: '2026-01-01'::date
  'study',                          -- status: 'study', 'construction_90', 'construction_180', 'construction_365', 'ready' (افتراضي: 'study')
  800000.00,                        -- land_cost: تكلفة الأرض (اختياري)
  1200000.00,                       -- construction_cost: تكلفة البناء (اختياري)
  2000000.00,                       -- total_cost: التكلفة الإجمالية (اختياري)
  24,                               -- project_duration_months: مدة المشروع بالأشهر (اختياري)
  12.50,                            -- expected_return_percentage: نسبة العائد المتوقع (اختياري)
  'medium',                         -- risk_level: 'low', 'medium', 'high' (اختياري)
  NULL,                             -- study_pdf_url: رابط ملف دراسة المشروع PDF (اختياري)
  NULL,                             -- thumbnail_url: رابط صورة المشروع (اختياري)
  '["full_name","phone","cin","email","notes"]'::jsonb,  -- purchase_form_fields: حقول استمارة الشراء المباشر
  '["نسخة بطاقة التعريف","شهادة دخل أو عدم دخل"]'::jsonb,  -- purchase_required_documents: المستندات المطلوبة للشراء المباشر
  NULL                              -- created_by: معرف المستخدم الذي أنشأ المشروع (اختياري) - UUID من profiles
);

-- ============================================================
-- أمثلة سريعة:
-- ============================================================

-- مثال 1: مشروع بسيط (الحد الأدنى من الحقول المطلوبة)
/*
INSERT INTO public.projects (
  name, governorate, district, housing_type, number_of_units
) VALUES (
  'مشروع تجريبي',
  'تونس',
  'المنزه',
  'apartment',
  50
);
*/

-- مثال 2: مشروع جاهز للتسليم
/*
INSERT INTO public.projects (
  name, description, governorate, district, housing_type, number_of_units,
  expected_price, completion_percentage, delivery_date, status,
  thumbnail_url
) VALUES (
  'مشروع جاهز للتسليم',
  'وحدات سكنية جاهزة مع تشطيب كامل',
  'صفاقس',
  'صفاقس المدينة',
  'apartment',
  60,
  210000.00,
  100,
  CURRENT_DATE,
  'ready',
  'https://example.com/project-image.jpg'
);
*/

-- مثال 3: مشروع قيد البناء (90 يوم)
/*
INSERT INTO public.projects (
  name, description, governorate, district, housing_type, number_of_units,
  expected_price, completion_percentage, delivery_date, start_date, status,
  land_cost, construction_cost, total_cost, project_duration_months
) VALUES (
  'مشروع البناء السريع',
  'بناء حديث، تسليم خلال 90 يوم',
  'سوسة',
  'سوسة سيدي عبد الحميد',
  'apartment',
  48,
  220000.00,
  35,
  (CURRENT_DATE + INTERVAL '90 days'),
  CURRENT_DATE,
  'construction_90',
  400000.00,
  600000.00,
  1000000.00,
  3
);
*/

-- ============================================================
-- ملاحظات:
-- ============================================================
-- 1. الحقول المطلوبة: name, governorate, district, housing_type, number_of_units
-- 2. housing_type: يجب أن يكون 'apartment' أو 'individual'
-- 3. status: يجب أن يكون أحد: 'study', 'construction_90', 'construction_180', 'construction_365', 'ready'
-- 4. purchase_form_fields: JSONB array من الحقول مثل ["full_name","phone","cin","email","notes"]
-- 5. purchase_required_documents: JSONB array من أسماء المستندات بالعربية
-- 6. completion_percentage: يجب أن يكون بين 0 و 100
-- 7. delivery_date و start_date: يمكن استخدام CURRENT_DATE أو تاريخ محدد مثل '2026-12-31'::date
