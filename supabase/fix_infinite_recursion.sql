-- Fix Infinite Recursion in RLS Policies
-- The admin policy queries profiles table, causing infinite recursion
-- Solution: Use SECURITY DEFINER function to bypass RLS when checking admin status

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a function that bypasses RLS to check admin status
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- SECURITY DEFINER allows this function to bypass RLS
  -- So it can check the profiles table without triggering policies
  SELECT role INTO user_role_val
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role_val = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create the policy using the function (no recursion!)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id  -- Users can always see their own profile
    OR
    check_is_admin()  -- Admins can see all (checked via function that bypasses RLS)
  );

-- Fix the same issue in other tables
DROP POLICY IF EXISTS "Admins can view all applications" ON public.housing_applications;
CREATE POLICY "Admins can view all applications"
  ON public.housing_applications FOR SELECT
  USING (
    auth.uid() = user_id  -- Users can see their own
    OR
    check_is_admin()  -- Admins can see all
  );

DROP POLICY IF EXISTS "Admins can update applications" ON public.housing_applications;
CREATE POLICY "Admins can update applications"
  ON public.housing_applications FOR UPDATE
  USING (
    auth.uid() = user_id  -- Users can update their own
    OR
    check_is_admin()  -- Admins can update all
  );

DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  USING (check_is_admin());

DROP POLICY IF EXISTS "Admins can view all investments" ON public.investments;
CREATE POLICY "Admins can view all investments"
  ON public.investments FOR SELECT
  USING (
    auth.uid() = investor_id  -- Investors can see their own
    OR
    check_is_admin()  -- Admins can see all
  );

DROP POLICY IF EXISTS "Admins can update investments" ON public.investments;
CREATE POLICY "Admins can update investments"
  ON public.investments FOR UPDATE
  USING (check_is_admin());

DROP POLICY IF EXISTS "Admins can manage returns" ON public.investment_returns;
CREATE POLICY "Admins can manage returns"
  ON public.investment_returns FOR ALL
  USING (check_is_admin());
