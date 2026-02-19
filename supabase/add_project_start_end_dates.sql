-- Add start_date for project timing. End date = delivery_date (existing).
-- Enables: countdown, "finished" when past end, extend by updating delivery_date.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT NULL;

COMMENT ON COLUMN public.projects.start_date IS 'تاريخ بدء المشروع';
COMMENT ON COLUMN public.projects.delivery_date IS 'تاريخ الانتهاء المتوقع (يمكن تمديده)';
