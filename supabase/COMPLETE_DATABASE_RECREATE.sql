-- ============================================================
-- إعادة إنشاء قاعدة البيانات بالكامل - البنية الجديدة الكاملة
-- Domobat / برنامج السكن الاقتصادي السريع
-- 
-- ⚠️ تحذير: هذا الملف سيحذف جميع البيانات والجداول الموجودة!
-- نفّذ هذا الملف في Supabase SQL Editor
-- ============================================================

-- ============================================================
-- الخطوة 1: حذف جميع الجداول والـ policies والـ functions
-- ============================================================

-- حذف الـ triggers أولاً
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_applications_updated_at ON public.housing_applications;
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_investments_updated_at ON public.investments;
DROP TRIGGER IF EXISTS update_direct_purchases_updated_at ON public.project_direct_purchases;

-- حذف الـ functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS calculate_application_score(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_is_admin() CASCADE;

-- حذف جميع الـ policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own applications" ON public.housing_applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.housing_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.housing_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.housing_applications;
DROP POLICY IF EXISTS "Users can update own application" ON public.housing_applications;
DROP POLICY IF EXISTS "Everyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Investors can view their own investments" ON public.investments;
DROP POLICY IF EXISTS "Investors can create investments" ON public.investments;
DROP POLICY IF EXISTS "Admins can view all investments" ON public.investments;
DROP POLICY IF EXISTS "Admins can update investments" ON public.investments;
DROP POLICY IF EXISTS "Investors can view their returns" ON public.investment_returns;
DROP POLICY IF EXISTS "Admins can manage returns" ON public.investment_returns;
DROP POLICY IF EXISTS "Users can view own direct purchases" ON public.project_direct_purchases;
DROP POLICY IF EXISTS "Users can create direct purchase request" ON public.project_direct_purchases;
DROP POLICY IF EXISTS "Admins can view all direct purchases" ON public.project_direct_purchases;
DROP POLICY IF EXISTS "Admins can update direct purchases" ON public.project_direct_purchases;
DROP POLICY IF EXISTS "Anyone can read active required document types" ON public.required_document_types;
DROP POLICY IF EXISTS "Admins can manage required document types" ON public.required_document_types;

-- حذف الجداول (بالترتيب الصحيح بسبب الـ foreign keys)
DROP TABLE IF EXISTS public.investment_returns CASCADE;
DROP TABLE IF EXISTS public.investments CASCADE;
DROP TABLE IF EXISTS public.project_direct_purchases CASCADE;
DROP TABLE IF EXISTS public.housing_applications CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.required_document_types CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- حذف الـ enums (إن لم تكن مستخدمة في مكان آخر)
-- ملاحظة: لا نحذف الـ enums لأنها قد تكون مستخدمة في Supabase auth

-- ============================================================
-- الخطوة 2: إنشاء الـ enums (إن لم تكن موجودة)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('applicant', 'investor', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE marital_status AS ENUM ('single', 'married', 'divorced', 'widowed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contract_type AS ENUM ('permanent', 'temporary', 'self_employed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE housing_type AS ENUM ('individual', 'apartment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('study', 'construction_90', 'construction_180', 'construction_365', 'ready');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- الخطوة 3: إنشاء الجداول بالبنية الجديدة الكاملة
-- ============================================================

-- جدول profiles (المستخدمين)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'applicant',
  phone_number TEXT UNIQUE NOT NULL,
  email TEXT,
  cin TEXT,
  name TEXT,
  country TEXT DEFAULT 'Tunisia',
  city TEXT,
  governorate TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- جدول housing_applications (طلبات السكن) - البنية الجديدة الكاملة
CREATE TABLE public.housing_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Section 1: المعطيات الشخصية
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  national_id TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  marital_status marital_status NOT NULL,
  number_of_children INTEGER DEFAULT 0,
  family_count INTEGER DEFAULT 0,
  children_ages TEXT,
  current_address TEXT NOT NULL, -- الولاية
  
  -- Section 2: الوضعية المهنية
  employment_status TEXT, -- موظف قار، بعقد، عامل حر، صاحب مشروع، عاطل
  work_sector TEXT, -- عمومي / خاص / غير منظم
  skills TEXT, -- المهارات (جديد)
  net_monthly_income DECIMAL(10, 2),
  income_stable TEXT, -- نعم / لا
  extra_income TEXT,
  
  -- Section 3: الوضعية المالية
  has_financial_obligations TEXT, -- نعم / لا
  total_monthly_obligations DECIMAL(10, 2),
  max_monthly_payment DECIMAL(10, 2),
  can_save_20_percent TEXT, -- نعم / لا / جزئياً
  down_payment_value DECIMAL(10, 2),
  
  -- Section 4: الوضعية السكنية الحالية
  current_housing_type TEXT, -- كراء، ملك، سكن عائلي، بدون سكن قار
  current_residence_duration TEXT,
  current_rent_value DECIMAL(10, 2),
  housing_problems JSONB DEFAULT '[]'::jsonb, -- غلاء الكراء، ضيق المساحة، إلخ
  
  -- Section 5: العقار (مسار أرض المواطن)
  owns_land TEXT, -- نعم / لا
  land_location TEXT,
  land_address_gps TEXT,
  land_area_sqm DECIMAL(10, 2),
  land_nature TEXT, -- داخل بلدية، خارج بلدية، فلاحية
  land_ownership_type TEXT, -- ملك شخصي، مشترك، في طور التسوية
  land_registered TEXT, -- نعم / لا
  has_ownership_doc TEXT, -- نعم / لا
  has_building_permit TEXT, -- نعم / لا
  company_handle_permit TEXT, -- نعم / لا
  land_legal_issues TEXT, -- نعم / لا
  desired_housing_type_land TEXT, -- اقتصادي أساسي/متوسط/مريح
  custom_design_or_ready TEXT, -- تصميم خاص / نموذج جاهز
  rooms_count_land INTEGER,
  want_future_floor TEXT, -- نعم / لا
  service_type TEXT, -- Gros œuvre, تشطيب متوسط, Clé en main
  pay_down_direct TEXT, -- نعم / لا / جزئياً
  want_installment_building_only TEXT, -- نعم / لا
  installment_years_land TEXT, -- 5, 10, 15, 20
  company_provide_full_property TEXT, -- نعم / لا (مسار شراء أرض + بناء)
  
  -- Section 6: معلومات حول نوع السكن المطلوب (جديد)
  housing_type_model TEXT, -- شقة، فيلا اقتصادية، مسكن فردي مستقل، إلخ
  housing_individual_collective TEXT, -- فردي / جماعي
  housing_area TEXT, -- 60, 80, 100, custom
  housing_area_custom INTEGER, -- Custom area value
  housing_model TEXT, -- 60, 80, 100 م² (للتوافق مع الكود القديم)
  accept_area_adjustment TEXT, -- نعم / لا
  desired_total_area TEXT, -- المساحة الجملية المرغوبة
  number_of_rooms TEXT, -- عدد الغرف المطلوبة
  additional_components JSONB DEFAULT '[]'::jsonb, -- مكونات إضافية مرغوبة
  housing_purpose TEXT, -- الهدف من السكن
  
  -- Section 7: مدة التقسيط وطريقة الدفع (جديد)
  payment_type TEXT, -- تقسيط / دفع كامل
  payment_percentage DECIMAL(5, 2), -- النسبة المدفوعة (1%-100%)
  installment_period TEXT, -- 5, 10, 15, 20, 25 سنوات
  
  -- Section 8: الشراكة مع الدولة
  agree_state_referral TEXT, -- نعم / لا
  previous_social_housing TEXT, -- نعم / لا
  registered_social_affairs TEXT, -- نعم / لا
  accept_social_economic_housing TEXT, -- نعم / لا
  accept_followup_via_platform TEXT, -- نعم / لا
  
  -- Section 9: معلومات إضافية (جديد)
  additional_info TEXT, -- النص
  additional_info_type TEXT, -- نص / صوت
  additional_info_voice_url TEXT, -- رابط التسجيل الصوتي
  
  -- المستندات
  documents_requested_message TEXT,
  applicant_documents JSONB DEFAULT '[]'::jsonb,
  
  -- الحقول القديمة للتوافق (يمكن حذفها لاحقاً)
  governorate TEXT NOT NULL,
  desired_housing_type housing_type NOT NULL DEFAULT 'apartment',
  required_area INTEGER,
  maximum_budget DECIMAL(10, 2),
  
  -- Scoring
  application_score INTEGER DEFAULT 0,
  priority_level TEXT DEFAULT 'normal',
  
  -- Status
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- جدول projects (المشاريع)
CREATE TABLE public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  governorate TEXT NOT NULL,
  district TEXT NOT NULL,
  housing_type housing_type NOT NULL,
  number_of_units INTEGER NOT NULL,
  expected_price DECIMAL(10, 2),
  completion_percentage INTEGER DEFAULT 0,
  delivery_date DATE,
  status project_status NOT NULL DEFAULT 'study',
  
  -- Project costs
  land_cost DECIMAL(10, 2),
  construction_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  project_duration_months INTEGER,
  expected_return_percentage DECIMAL(5, 2),
  risk_level TEXT,
  
  -- Project study PDF
  study_pdf_url TEXT,
  
  -- حقول طلب الشراء المباشر
  purchase_form_fields JSONB DEFAULT '["full_name","phone","cin","email","notes"]'::jsonb,
  purchase_required_documents JSONB DEFAULT '["نسخة بطاقة التعريف","شهادة دخل أو عدم دخل"]'::jsonb,
  
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- جدول project_direct_purchases (طلبات الشراء المباشر)
CREATE TABLE public.project_direct_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  form_data JSONB,
  documents_note TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, project_id)
);

-- جدول investments (الاستثمارات)
CREATE TABLE public.investments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  investor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  investment_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(investor_id, project_id)
);

-- جدول investment_returns (عوائد الاستثمار)
CREATE TABLE public.investment_returns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  investment_id UUID REFERENCES public.investments(id) ON DELETE CASCADE NOT NULL,
  return_amount DECIMAL(10, 2) NOT NULL,
  return_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- جدول required_document_types (أنواع المستندات المطلوبة)
CREATE TABLE public.required_document_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  label_ar TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================================
-- الخطوة 4: تفعيل Row Level Security
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_direct_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.required_document_types ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- الخطوة 5: إنشاء الـ Functions
-- ============================================================

-- Function للتحقق من صلاحيات الأدمن
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN COALESCE(user_role_val = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function لحساب نقاط الطلب
CREATE OR REPLACE FUNCTION calculate_application_score(app_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  app RECORD;
BEGIN
  SELECT * INTO app FROM public.housing_applications WHERE id = app_id;
  
  -- Financial stability (0-30 points)
  IF app.net_monthly_income > 0 THEN
    score := score + LEAST(30, (app.net_monthly_income / 1000)::INTEGER);
  END IF;
  
  -- Family size (0-20 points)
  IF app.number_of_children > 0 THEN
    score := score + LEAST(20, app.number_of_children * 5);
  END IF;
  
  -- Update priority level
  UPDATE public.housing_applications
  SET 
    application_score = score,
    priority_level = CASE
      WHEN score >= 80 THEN 'high'
      WHEN score >= 50 THEN 'medium'
      ELSE 'normal'
    END
  WHERE id = app_id;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- الخطوة 6: إنشاء الـ Triggers
-- ============================================================

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at 
  BEFORE UPDATE ON public.housing_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_direct_purchases_updated_at 
  BEFORE UPDATE ON public.project_direct_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at 
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- الخطوة 7: إنشاء الـ RLS Policies
-- ============================================================

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR check_is_admin());

-- Housing Applications Policies
CREATE POLICY "Users can create their own applications"
  ON public.housing_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications"
  ON public.housing_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own application"
  ON public.housing_applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
  ON public.housing_applications FOR SELECT
  USING (auth.uid() = user_id OR check_is_admin());

CREATE POLICY "Admins can update applications"
  ON public.housing_applications FOR UPDATE
  USING (auth.uid() = user_id OR check_is_admin());

-- Projects Policies
CREATE POLICY "Everyone can view projects"
  ON public.projects FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  USING (check_is_admin());

-- Project Direct Purchases Policies
CREATE POLICY "Users can view own direct purchases"
  ON public.project_direct_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create direct purchase request"
  ON public.project_direct_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all direct purchases"
  ON public.project_direct_purchases FOR SELECT
  USING (check_is_admin());

CREATE POLICY "Admins can update direct purchases"
  ON public.project_direct_purchases FOR UPDATE
  USING (check_is_admin());

-- Investments Policies
CREATE POLICY "Investors can view their own investments"
  ON public.investments FOR SELECT
  USING (auth.uid() = investor_id);

CREATE POLICY "Investors can create investments"
  ON public.investments FOR INSERT
  WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Admins can view all investments"
  ON public.investments FOR SELECT
  USING (auth.uid() = investor_id OR check_is_admin());

CREATE POLICY "Admins can update investments"
  ON public.investments FOR UPDATE
  USING (check_is_admin());

-- Investment Returns Policies
CREATE POLICY "Investors can view their returns"
  ON public.investment_returns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investments
      WHERE investments.id = investment_returns.investment_id
      AND investments.investor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage returns"
  ON public.investment_returns FOR ALL
  USING (check_is_admin());

-- Required Document Types Policies
CREATE POLICY "Anyone can read active required document types"
  ON public.required_document_types FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage required document types"
  ON public.required_document_types FOR ALL
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- ============================================================
-- الخطوة 8: إدراج البيانات الافتراضية
-- ============================================================

-- إدراج قائمة المستندات المطلوبة الافتراضية
INSERT INTO public.required_document_types (label_ar, sort_order, active) VALUES
  ('نسخة بطاقة التعريف الوطنية', 1, true),
  ('شهادة دخل أو شهادة عدم دخل', 2, true),
  ('شهادة الإقامة أو عقد الكراء', 3, true),
  ('شهادة العمل أو عقد الشغل', 4, true),
  ('كشف حساب بنكي (آخر 3 أشهر)', 5, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ✅ اكتمل إعادة إنشاء قاعدة البيانات
-- ============================================================

-- ملخص البنية الجديدة:
-- ✅ profiles - جدول المستخدمين مع الحقول الجديدة (name, governorate)
-- ✅ housing_applications - جدول طلبات السكن مع جميع الحقول الجديدة:
--    - skills (المهارات)
--    - housing_type_model, housing_individual_collective, housing_area, housing_area_custom
--    - desired_total_area, number_of_rooms, additional_components, housing_purpose
--    - payment_type, payment_percentage, installment_period
--    - additional_info_type, additional_info_voice_url
--    - documents_requested_message, applicant_documents
-- ✅ projects - جدول المشاريع مع purchase_form_fields و purchase_required_documents
-- ✅ project_direct_purchases - جدول طلبات الشراء المباشر
-- ✅ investments - جدول الاستثمارات
-- ✅ investment_returns - جدول عوائد الاستثمار
-- ✅ required_document_types - جدول أنواع المستندات المطلوبة
-- ✅ جميع الـ RLS Policies
-- ✅ جميع الـ Functions والـ Triggers
