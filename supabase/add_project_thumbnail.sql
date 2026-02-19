-- Add thumbnail image URL for projects (displayed on cards and detail page)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN public.projects.thumbnail_url IS 'URL of project thumbnail image (e.g. from Supabase Storage or external)';
