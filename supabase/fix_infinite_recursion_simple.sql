-- Quick Fix for Infinite Recursion Error
-- Run this in Supabase SQL Editor

-- Create function to check admin status (bypasses RLS)
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- SECURITY DEFINER allows bypassing RLS to check admin status
  SELECT role INTO user_role_val
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN COALESCE(user_role_val = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix profiles policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR check_is_admin());

-- Fix applications policies
DROP POLICY IF EXISTS "Admins can view all applications" ON public.housing_applications;
CREATE POLICY "Admins can view all applications"
  ON public.housing_applications FOR SELECT
  USING (auth.uid() = user_id OR check_is_admin());

DROP POLICY IF EXISTS "Admins can update applications" ON public.housing_applications;
CREATE POLICY "Admins can update applications"
  ON public.housing_applications FOR UPDATE
  USING (auth.uid() = user_id OR check_is_admin());

-- Fix projects policy
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  USING (check_is_admin());

-- Fix investments policies
DROP POLICY IF EXISTS "Admins can view all investments" ON public.investments;
CREATE POLICY "Admins can view all investments"
  ON public.investments FOR SELECT
  USING (auth.uid() = investor_id OR check_is_admin());

DROP POLICY IF EXISTS "Admins can update investments" ON public.investments;
CREATE POLICY "Admins can update investments"
  ON public.investments FOR UPDATE
  USING (check_is_admin());

-- Fix returns policy
DROP POLICY IF EXISTS "Admins can manage returns" ON public.investment_returns;
CREATE POLICY "Admins can manage returns"
  ON public.investment_returns FOR ALL
  USING (check_is_admin());
