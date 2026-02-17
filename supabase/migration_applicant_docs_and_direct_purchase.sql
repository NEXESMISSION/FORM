-- Add column for admin to request more documents (message shown to applicant)
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS documents_requested_message TEXT;

-- Table for direct purchase requests (user clicks "Buy" on a project - no form/5%)
CREATE TABLE IF NOT EXISTS public.project_direct_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, project_id)
);

ALTER TABLE public.project_direct_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchase requests
CREATE POLICY "Users can view own direct purchases"
  ON public.project_direct_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own purchase request
CREATE POLICY "Users can create direct purchase request"
  ON public.project_direct_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view and update all
CREATE POLICY "Admins can view all direct purchases"
  ON public.project_direct_purchases FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update direct purchases"
  ON public.project_direct_purchases FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
