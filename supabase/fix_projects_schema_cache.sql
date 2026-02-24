-- Fix: "Could not find the 'start_date' column of 'projects' in the schema cache"
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query → Paste → Run).
-- After running, Supabase will include these columns in the schema cache.

-- Add start_date if missing (project start date for timing/countdown)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT NULL;

COMMENT ON COLUMN public.projects.start_date IS 'تاريخ بدء المشروع';

-- Add thumbnail_url if missing (project image on cards/detail)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN public.projects.thumbnail_url IS 'URL of project thumbnail image';
