-- Trigger to handle balance deduction/refund for investments
-- Run this in Supabase SQL Editor

-- Function to process investment balance changes
CREATE OR REPLACE FUNCTION process_investment_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- When investment is created (INSERT), deduct balance immediately
  IF TG_OP = 'INSERT' THEN
    -- Check if investor has sufficient balance
    IF (SELECT COALESCE(balance, 0) FROM public.profiles WHERE id = NEW.investor_id) < NEW.investment_amount THEN
      RAISE EXCEPTION 'Insufficient balance. Available: % TND, Required: % TND', 
        (SELECT COALESCE(balance, 0) FROM public.profiles WHERE id = NEW.investor_id),
        NEW.investment_amount;
    END IF;
    
    -- Deduct balance immediately
    UPDATE public.profiles
    SET balance = COALESCE(balance, 0) - NEW.investment_amount
    WHERE id = NEW.investor_id;
    
    RETURN NEW;
  END IF;
  
  -- When investment status changes (UPDATE)
  IF TG_OP = 'UPDATE' THEN
    -- Only process if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      -- If status changed from pending/approved to rejected, refund the balance
      -- Only refund if the investment was NOT already rejected (to prevent double refunds)
      IF OLD.status != 'rejected' AND NEW.status = 'rejected' THEN
        UPDATE public.profiles
        SET balance = COALESCE(balance, 0) + OLD.investment_amount
        WHERE id = OLD.investor_id;
      END IF;
      
      -- If status changed from rejected back to approved/pending, deduct again
      -- Only deduct if it was previously rejected (to prevent double deductions)
      IF OLD.status = 'rejected' AND NEW.status != 'rejected' THEN
        -- Check if investor has sufficient balance
        IF (SELECT COALESCE(balance, 0) FROM public.profiles WHERE id = NEW.investor_id) < NEW.investment_amount THEN
          RAISE EXCEPTION 'Insufficient balance. Available: % TND, Required: % TND', 
            (SELECT COALESCE(balance, 0) FROM public.profiles WHERE id = NEW.investor_id),
            NEW.investment_amount;
        END IF;
        
        UPDATE public.profiles
        SET balance = COALESCE(balance, 0) - NEW.investment_amount
        WHERE id = NEW.investor_id;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS process_investment_balance_trigger ON public.investments;

-- Create trigger for INSERT (deduct balance when investment is created)
CREATE TRIGGER process_investment_balance_insert_trigger
  BEFORE INSERT ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION process_investment_balance();

-- Create trigger for UPDATE (refund if rejected, deduct if re-approved)
CREATE TRIGGER process_investment_balance_update_trigger
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION process_investment_balance();
