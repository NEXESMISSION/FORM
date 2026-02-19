-- ============================================================
-- Fix monthly obligations column name
-- ============================================================
-- This script ensures the correct column name exists
-- If monthly_obligations exists, rename it to total_monthly_obligations
-- OR add total_monthly_obligations if it doesn't exist
-- ============================================================

-- Option 1: If monthly_obligations exists, rename it to total_monthly_obligations
DO $$
BEGIN
  -- Check if monthly_obligations exists and total_monthly_obligations doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'housing_applications' 
    AND column_name = 'monthly_obligations'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'housing_applications' 
    AND column_name = 'total_monthly_obligations'
  ) THEN
    ALTER TABLE public.housing_applications
    RENAME COLUMN monthly_obligations TO total_monthly_obligations;
    RAISE NOTICE 'Renamed monthly_obligations to total_monthly_obligations';
  END IF;
END $$;

-- Option 2: If total_monthly_obligations doesn't exist, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'housing_applications' 
    AND column_name = 'total_monthly_obligations'
  ) THEN
    ALTER TABLE public.housing_applications
    ADD COLUMN total_monthly_obligations DECIMAL(10, 2);
    RAISE NOTICE 'Added total_monthly_obligations column';
  END IF;
END $$;

-- Option 3: Copy data from monthly_obligations to total_monthly_obligations if both exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'housing_applications' 
    AND column_name = 'monthly_obligations'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'housing_applications' 
    AND column_name = 'total_monthly_obligations'
  ) THEN
    UPDATE public.housing_applications
    SET total_monthly_obligations = monthly_obligations
    WHERE total_monthly_obligations IS NULL AND monthly_obligations IS NOT NULL;
    RAISE NOTICE 'Copied data from monthly_obligations to total_monthly_obligations';
  END IF;
END $$;

-- Verification
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'housing_applications'
  AND (column_name = 'monthly_obligations' OR column_name = 'total_monthly_obligations')
ORDER BY column_name;
