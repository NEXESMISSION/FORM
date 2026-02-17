-- Setup Supabase Storage for balance proof images
-- Run this in Supabase SQL Editor

-- Create storage bucket for balance proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('balance-proofs', 'balance-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Investors can upload balance proofs" ON storage.objects;
DROP POLICY IF EXISTS "Investors can view their own balance proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all balance proofs" ON storage.objects;
DROP POLICY IF EXISTS "Investors can delete their own balance proofs" ON storage.objects;

-- Storage policies for balance-proofs bucket
-- Allow authenticated users to upload their own files (path must start with their user ID)
CREATE POLICY "Investors can upload balance proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'balance-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own files
CREATE POLICY "Investors can view their own balance proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'balance-proofs' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- Allow admins to view all files (included in above policy, but keeping for clarity)
CREATE POLICY "Admins can view all balance proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'balance-proofs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow users to delete their own files
CREATE POLICY "Investors can delete their own balance proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'balance-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
