-- ============================================================
-- 1) Add video_urls column
-- 2) Set every project to have 5 images (slider) + 2 YouTube videos
-- Run in Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS video_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.projects.video_urls IS 'مصفوفة معرفات فيديو يوتيوب (Video ID أو رابط كامل)';

-- Give each project 5 images (different picsum seeds per project) + 2 test YouTube IDs
UPDATE public.projects p
SET
  image_urls = (
    SELECT jsonb_agg(to_jsonb('https://picsum.photos/seed/' || p.id::text || '-' || n || '/800/600') ORDER BY n)
    FROM generate_series(1, 5) AS n
  ),
  thumbnail_url = COALESCE(p.thumbnail_url, (p.image_urls->>0))
WHERE p.id IS NOT NULL;

UPDATE public.projects
SET video_urls = '["gUbNlN_SqpE", "dQw4w9WgXcQ"]'::jsonb
WHERE video_urls IS NULL OR jsonb_array_length(COALESCE(video_urls, '[]'::jsonb)) = 0;

-- Ensure thumbnail = first image for slider
UPDATE public.projects
SET thumbnail_url = (image_urls->>0)
WHERE jsonb_array_length(COALESCE(image_urls, '[]'::jsonb)) > 0;
