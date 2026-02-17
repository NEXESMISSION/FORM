-- Create balance_requests table for investor balance top-ups
-- Run this in Supabase SQL Editor

-- Create payment method enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('bank_transfer', 'flouci', 'd17', 'cash', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create balance_requests table
CREATE TABLE IF NOT EXISTS public.balance_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  investor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_reference TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add balance column to profiles if it doesn't exist
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN balance DECIMAL(10, 2) DEFAULT 0.00;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Enable RLS
ALTER TABLE public.balance_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for balance_requests
CREATE POLICY "Investors can view their own balance requests"
  ON public.balance_requests FOR SELECT
  USING (auth.uid() = investor_id);

CREATE POLICY "Investors can create balance requests"
  ON public.balance_requests FOR INSERT
  WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Admins can view all balance requests"
  ON public.balance_requests FOR SELECT
  USING (check_is_admin());

CREATE POLICY "Admins can update balance requests"
  ON public.balance_requests FOR UPDATE
  USING (check_is_admin());

-- Trigger to update updated_at
CREATE TRIGGER update_balance_requests_updated_at 
  BEFORE UPDATE ON public.balance_requests
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update investor balance when request is approved
CREATE OR REPLACE FUNCTION process_balance_request()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to approved, add balance to investor
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE public.profiles
    SET balance = COALESCE(balance, 0) + NEW.amount
    WHERE id = NEW.investor_id;
  END IF;
  
  -- Update reviewed_at and reviewed_by
  IF NEW.status != 'pending' AND OLD.status = 'pending' THEN
    NEW.reviewed_at = TIMEZONE('utc', NOW());
    NEW.reviewed_by = auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to process balance request
CREATE TRIGGER process_balance_request_trigger
  BEFORE UPDATE ON public.balance_requests
  FOR EACH ROW
  WHEN (NEW.status != OLD.status)
  EXECUTE FUNCTION process_balance_request();
