-- Add has_seen_intro field to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_seen_intro BOOLEAN DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_has_seen_intro ON public.profiles(has_seen_intro);

-- Update existing users to have seen intro (optional - comment out if you want new users to see it)
-- UPDATE public.profiles SET has_seen_intro = true WHERE has_seen_intro IS NULL;
