-- Migration: Add email, CIN, country, and city to profiles table
-- Run this if you already have the database set up

-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS cin TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Tunisia',
ADD COLUMN IF NOT EXISTS city TEXT;

-- Update existing profiles to have default country
UPDATE public.profiles 
SET country = 'Tunisia' 
WHERE country IS NULL;
