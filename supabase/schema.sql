-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE user_role AS ENUM ('applicant', 'investor', 'admin');

-- Marital status enum
CREATE TYPE marital_status AS ENUM ('single', 'married', 'divorced', 'widowed');

-- Contract type enum
CREATE TYPE contract_type AS ENUM ('permanent', 'temporary', 'self_employed');

-- Housing type enum
CREATE TYPE housing_type AS ENUM ('individual', 'apartment');

-- Project status enum
CREATE TYPE project_status AS ENUM ('study', 'construction_90', 'construction_180', 'construction_365', 'ready');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'applicant',
  phone_number TEXT UNIQUE NOT NULL,
  email TEXT,
  cin TEXT,
  country TEXT DEFAULT 'Tunisia',
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Housing applications table
CREATE TABLE public.housing_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Section 1: Personal Identity
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  national_id TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Section 2: Family Status
  marital_status marital_status NOT NULL,
  number_of_children INTEGER DEFAULT 0,
  supports_another_family BOOLEAN DEFAULT FALSE,
  
  -- Section 3: Employment Status
  profession TEXT,
  contract_type contract_type,
  employer TEXT,
  employment_duration_months INTEGER,
  net_monthly_income DECIMAL(10, 2),
  
  -- Section 4: Financial Status
  total_household_income DECIMAL(10, 2),
  monthly_obligations DECIMAL(10, 2),
  current_loans DECIMAL(10, 2),
  monthly_saving_capacity DECIMAL(10, 2),
  
  -- Section 5: Bank Financing
  bank_name TEXT,
  has_active_bank_account BOOLEAN DEFAULT FALSE,
  previously_applied_for_loan BOOLEAN DEFAULT FALSE,
  has_preliminary_approval BOOLEAN DEFAULT FALSE,
  eligible_for_subsidized_housing BOOLEAN DEFAULT FALSE,
  
  -- Section 6: Current Housing Situation
  living_with_family BOOLEAN DEFAULT FALSE,
  renting BOOLEAN DEFAULT FALSE,
  owns_home BOOLEAN DEFAULT FALSE,
  informal_housing BOOLEAN DEFAULT FALSE,
  rural_area BOOLEAN DEFAULT FALSE,
  
  -- Section 7: Desired Housing Characteristics
  governorate TEXT NOT NULL,
  district TEXT,
  proximity_to_workplace BOOLEAN DEFAULT FALSE,
  proximity_to_schools BOOLEAN DEFAULT FALSE,
  desired_housing_type housing_type NOT NULL,
  required_area INTEGER,
  number_of_rooms INTEGER,
  maximum_budget DECIMAL(10, 2),
  acceptable_delivery_time_months INTEGER,
  
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

-- Real estate projects table
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
  
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Investor investments table
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

-- Investment returns tracking
CREATE TABLE public.investment_returns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  investment_id UUID REFERENCES public.investments(id) ON DELETE CASCADE NOT NULL,
  return_amount DECIMAL(10, 2) NOT NULL,
  return_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_returns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to check admin status without recursion
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

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id OR check_is_admin()
  );

-- RLS Policies for housing_applications
CREATE POLICY "Users can create their own applications"
  ON public.housing_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications"
  ON public.housing_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
  ON public.housing_applications FOR SELECT
  USING (
    auth.uid() = user_id OR check_is_admin()
  );

CREATE POLICY "Admins can update applications"
  ON public.housing_applications FOR UPDATE
  USING (
    auth.uid() = user_id OR check_is_admin()
  );

-- RLS Policies for projects
CREATE POLICY "Everyone can view projects"
  ON public.projects FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  USING (check_is_admin());

-- RLS Policies for investments
CREATE POLICY "Investors can view their own investments"
  ON public.investments FOR SELECT
  USING (auth.uid() = investor_id);

CREATE POLICY "Investors can create investments"
  ON public.investments FOR INSERT
  WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Admins can view all investments"
  ON public.investments FOR SELECT
  USING (
    auth.uid() = investor_id OR check_is_admin()
  );

CREATE POLICY "Admins can update investments"
  ON public.investments FOR UPDATE
  USING (check_is_admin());

-- RLS Policies for investment_returns
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

-- Function to calculate application score
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
  
  -- Lack of home ownership (0-25 points)
  IF NOT app.owns_home THEN
    score := score + 25;
  END IF;
  
  -- Bank financing eligibility (0-25 points)
  IF app.has_active_bank_account THEN
    score := score + 10;
  END IF;
  IF app.has_preliminary_approval THEN
    score := score + 15;
  END IF;
  IF app.eligible_for_subsidized_housing THEN
    score := score + 10;
  END IF;
  
  -- Employment stability (0-10 points)
  IF app.contract_type = 'permanent' THEN
    score := score + 10;
  ELSIF app.contract_type = 'temporary' THEN
    score := score + 5;
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

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.housing_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
