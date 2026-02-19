-- Fix storage RLS policies for 'documents' bucket
-- Allows authenticated users to upload/view their own files and admins to view all
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1) Create the bucket if it doesn't exist (required for uploads to work)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Drop existing policies for documents bucket if any
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

-- 3) Allow authenticated users to upload only to their own folder
--    Path format: housing-documents/{auth.uid()}/... or purchase-documents/{auth.uid()}/...
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (
    (
      (storage.foldername(name))[1] = 'housing-documents' AND
      (storage.foldername(name))[2] = auth.uid()::text
    ) OR
    (
      (storage.foldername(name))[1] = 'purchase-documents' AND
      (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

-- Allow users to view their own files OR admins to view all files
CREATE POLICY "Users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    -- Users can view files in their own folders
    (
      (storage.foldername(name))[1] = 'housing-documents' AND
      (storage.foldername(name))[2] = auth.uid()::text
    ) OR
    (
      (storage.foldername(name))[1] = 'purchase-documents' AND
      (storage.foldername(name))[2] = auth.uid()::text
    ) OR
    -- Admins can view all files
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    (
      (storage.foldername(name))[1] = 'housing-documents' AND
      (storage.foldername(name))[2] = auth.uid()::text
    ) OR
    (
      (storage.foldername(name))[1] = 'purchase-documents' AND
      (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);
