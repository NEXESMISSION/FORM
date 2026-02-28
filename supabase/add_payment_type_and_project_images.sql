-- Add payment type to direct purchases: بالحاضر (full) or بالتقسيط (installment)
ALTER TABLE public.project_direct_purchases
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'full';

COMMENT ON COLUMN public.project_direct_purchases.payment_type IS 'طريقة الدفع: full = بالحاضر، installment = بالتقسيط';

-- Add multiple images per project (array of URLs); keep thumbnail_url for first/primary image
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.projects.image_urls IS 'مصفوفة روابط صور المشروع (عدة صور لكل مشروع)';

-- Link housing application to direct purchase when user chose installment and filled the form
ALTER TABLE public.housing_applications
  ADD COLUMN IF NOT EXISTS direct_purchase_id UUID REFERENCES public.project_direct_purchases(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.housing_applications.direct_purchase_id IS 'طلب الشراء المرتبط (عند اختيار بالتقسيط)';
