-- Quick Fix: Add missing INSERT policy for profiles
-- Run this in Supabase SQL Editor if you're getting 400 errors on registration

-- Drop policy if it exists, then create it
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also ensure the columns exist (safe to run multiple times)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS cin TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Tunisia',
ADD COLUMN IF NOT EXISTS city TEXT;

-- Update existing profiles to have default country
UPDATE public.profiles 
SET country = 'Tunisia' 
WHERE country IS NULL;
