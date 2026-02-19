-- ============================================================
-- المستندات المطلوبة (قائمة يتحكم فيها الأدمن)
-- نفّذ في Supabase SQL Editor
-- ============================================================

-- جدول أنواع المستندات المطلوبة (قائمة افتراضية قابلة للتعديل)
CREATE TABLE IF NOT EXISTS public.required_document_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  label_ar TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.required_document_types ENABLE ROW LEVEL SECURITY;

-- الجميع (بما فيهم المتقدمون) يمكنهم قراءة المستندات النشطة فقط
DROP POLICY IF EXISTS "Anyone can read active required document types" ON public.required_document_types;
CREATE POLICY "Anyone can read active required document types"
  ON public.required_document_types FOR SELECT
  USING (active = true);

-- الأدمن فقط: إدراج / تحديث / حذف
DROP POLICY IF EXISTS "Admins can manage required document types" ON public.required_document_types;
CREATE POLICY "Admins can manage required document types"
  ON public.required_document_types FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- إدراج القائمة الافتراضية (فقط إذا الجدول فارغ)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.required_document_types LIMIT 1) THEN
    INSERT INTO public.required_document_types (label_ar, sort_order, active) VALUES
      ('نسخة بطاقة التعريف الوطنية', 1, true),
      ('شهادة دخل أو شهادة عدم دخل', 2, true),
      ('شهادة الإقامة أو عقد الكراء', 3, true),
      ('شهادة العمل أو عقد الشغل', 4, true),
      ('كشف حساب بنكي (آخر 3 أشهر)', 5, true);
  END IF;
END $$;

-- ملاحظة: applicant_documents في housing_applications يبقى JSONB.
-- كل عنصر يمكن أن يكون: { id, docType, fileName, url, uploadedAt, status?, rejectionReason? }
-- status: 'pending_review' | 'accepted' | 'rejected'
