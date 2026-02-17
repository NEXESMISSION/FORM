-- Fix storage policies for balance-proofs bucket
-- Run this in Supabase SQL Editor if you're getting RLS errors

-- Drop existing policies
DROP POLICY IF EXISTS "Investors can upload balance proofs" ON storage.objects;
DROP POLICY IF EXISTS "Investors can view their own balance proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all balance proofs" ON storage.objects;
DROP POLICY IF EXISTS "Investors can delete their own balance proofs" ON storage.objects;

-- Create new policies with correct path checking
-- Allow authenticated users to upload files in their own folder
CREATE POLICY "Investors can upload balance proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'balance-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own files OR admins to view all files
CREATE POLICY "Users can view balance proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'balance-proofs' AND
  (
    -- Users can view their own files
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Admins can view all files
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
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
