-- ============================================================
-- Seed extra projects in the SAME cities to test المشاريع page:
-- - Grouped by city (governorate)
-- - Horizontal slider right-to-left per group
-- Run in Supabase SQL Editor. Safe to run (adds new rows).
-- ============================================================

-- تونس — 6 projects (same city = one group with slider)
INSERT INTO public.projects (
  name, description, location_lat, location_lng, governorate, district,
  housing_type, number_of_units, expected_price, completion_percentage,
  delivery_date, status, land_cost, construction_cost, total_cost,
  project_duration_months, expected_return_percentage, risk_level, thumbnail_url
) VALUES
('المشروع الأخضر - المنزه', 'مجمع سكني اقتصادي 120 وحدة بمنطقة المنزه، قيد الدراسة.', 36.8065, 10.1815, 'تونس', 'المنزه', 'apartment', 120, 185000.00, 0, (CURRENT_DATE + 540), 'study', 800000.00, 1200000.00, 2000000.00, 24, 12.50, 'medium', 'https://picsum.photos/seed/tunis-1/800/600'),
('برج تونس الشمالية', 'برج سكني 80 وحدة بتونس الشمالية، تسليم خلال سنة.', 36.8200, 10.1900, 'تونس', 'تونس الشمالية', 'apartment', 80, 220000.00, 25, (CURRENT_DATE + 365), 'construction_365', 500000.00, 900000.00, 1400000.00, 18, 11.00, 'medium', 'https://picsum.photos/seed/tunis-2/800/600'),
('حي المنزه الجديد - المرحلة 2', '60 وحدة سكن اقتصادي، قيد البناء 180 يوم.', 36.8080, 10.1820, 'تونس', 'المنزه', 'apartment', 60, 195000.00, 40, (CURRENT_DATE + 180), 'construction_180', 400000.00, 700000.00, 1100000.00, 14, 10.00, 'low', 'https://picsum.photos/seed/tunis-3/800/600'),
('سكن الشباب - المرسى', 'مشروع 40 شقة للشباب بضاحية المرسى.', 36.8789, 10.3247, 'تونس', 'المرسى', 'apartment', 40, 265000.00, 0, (CURRENT_DATE + 450), 'study', 600000.00, 800000.00, 1400000.00, 20, 9.50, 'medium', 'https://picsum.photos/seed/tunis-4/800/600'),
('وحدات قرطاج السكنية', '50 وحدة بمنطقة قرطاج، قرب المواصلات.', 36.8531, 10.3233, 'تونس', 'قرطاج', 'apartment', 50, 280000.00, 15, (CURRENT_DATE + 270), 'construction_90', 700000.00, 1000000.00, 1700000.00, 12, 12.00, 'low', 'https://picsum.photos/seed/tunis-5/800/600'),
('مجمع أريانة السكني', '100 وحدة بأريانة، تسليم خلال 6 أشهر.', 36.8625, 10.1956, 'تونس', 'أريانة', 'apartment', 100, 175000.00, 55, (CURRENT_DATE + 180), 'construction_180', 900000.00, 1100000.00, 2000000.00, 16, 10.50, 'medium', 'https://picsum.photos/seed/tunis-6/800/600');

-- صفاقس — 5 projects (second group with slider)
INSERT INTO public.projects (
  name, description, location_lat, location_lng, governorate, district,
  housing_type, number_of_units, expected_price, completion_percentage,
  delivery_date, status, land_cost, construction_cost, total_cost,
  project_duration_months, expected_return_percentage, risk_level, thumbnail_url
) VALUES
('واحة صفاقس السكنية', 'بناء حديث 48 وحدة بصفاقس المدينة، تسليم 90 يوم.', 34.7406, 10.7603, 'صفاقس', 'صفاقس المدينة', 'apartment', 48, 220000.00, 35, (CURRENT_DATE + 90), 'construction_90', 400000.00, 600000.00, 1000000.00, 12, 10.00, 'low', 'https://picsum.photos/seed/sfax-1/800/600'),
('برج صفاقس الجديد', '70 وحدة سكنية بقلب صفاقس، قيد الدراسة.', 34.7420, 10.7620, 'صفاقس', 'صفاقس المدينة', 'apartment', 70, 205000.00, 0, (CURRENT_DATE + 600), 'study', 550000.00, 950000.00, 1500000.00, 22, 11.00, 'medium', 'https://picsum.photos/seed/sfax-2/800/600'),
('سكن اقتصادي طينة', '90 وحدة بضاحية طينة، مخصص للأسر المتوسطة.', 34.7300, 10.7500, 'صفاقس', 'طينة', 'apartment', 90, 165000.00, 20, (CURRENT_DATE + 365), 'construction_365', 450000.00, 1200000.00, 1650000.00, 28, 9.00, 'medium', 'https://picsum.photos/seed/sfax-3/800/600'),
('فلل صفاقس الساحلية', '24 فيلا سكن فردي قرب البحر.', 34.7350, 10.7700, 'صفاقس', 'صفاقس المدينة', 'individual', 24, 380000.00, 60, (CURRENT_DATE + 120), 'construction_90', 1200000.00, 1800000.00, 3000000.00, 14, 14.00, 'low', 'https://picsum.photos/seed/sfax-4/800/600'),
('حي السعادة - صفاقس', '55 وحدة جاهزة للتسليم قريباً.', 34.7380, 10.7580, 'صفاقس', 'حي السعادة', 'apartment', 55, 195000.00, 95, (CURRENT_DATE + 60), 'construction_90', 380000.00, 720000.00, 1100000.00, 10, 10.50, 'low', 'https://picsum.photos/seed/sfax-5/800/600');

-- Optional: verify groups
-- SELECT governorate, COUNT(*) AS cnt, array_agg(name ORDER BY created_at) AS names
-- FROM public.projects GROUP BY governorate ORDER BY governorate;
