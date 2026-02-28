-- Allow applicants to update their own direct purchase (e.g. to add/replace documents when status is documents_requested)
-- Run in Supabase SQL Editor

DROP POLICY IF EXISTS "Users can update own direct purchases" ON public.project_direct_purchases;
CREATE POLICY "Users can update own direct purchases"
  ON public.project_direct_purchases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
