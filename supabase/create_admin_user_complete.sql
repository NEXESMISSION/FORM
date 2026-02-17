-- Complete Script: Create Admin User and Profile
-- This creates both the auth user and the profile

-- Step 1: Create the auth user (if it doesn't exist)
-- Note: You may need to create this through Supabase Dashboard → Authentication → Users first
-- Or use Supabase Auth API

-- Step 2: Create/Update the admin profile
INSERT INTO public.profiles (
  id,
  role,
  phone_number,
  email,
  cin,
  country,
  city,
  created_at,
  updated_at
) VALUES (
  '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid,
  'admin'::user_role,
  NULL,
  'owner@gmail.com',
  NULL,
  'Tunisia',
  NULL,
  TIMEZONE('utc', NOW()),
  TIMEZONE('utc', NOW())
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  email = COALESCE(EXCLUDED.email, profiles.email),
  country = COALESCE(EXCLUDED.country, profiles.country),
  city = EXCLUDED.city,
  updated_at = TIMEZONE('utc', NOW());

-- Step 3: Verify
SELECT 
  id,
  role,
  phone_number,
  email,
  cin,
  country,
  city,
  created_at,
  updated_at
FROM public.profiles 
WHERE id = '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid;
