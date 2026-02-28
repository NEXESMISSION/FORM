-- Add YouTube video URLs per project (array of video IDs or full URLs)
-- Run in Supabase SQL Editor. Safe to run multiple times.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS video_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.projects.video_urls IS 'مصفوفة معرفات فيديو يوتيوب (Video ID أو رابط كامل)';
