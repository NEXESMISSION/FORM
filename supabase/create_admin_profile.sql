-- Create Admin Profile
-- Run this in Supabase SQL Editor after creating the user in Authentication

-- First, make sure the user exists in auth.users
-- If not, you'll need to create the user first through Supabase Auth or registration

-- Insert admin profile
INSERT INTO public.profiles (
  id,
  role,
  phone_number,
  email,
  cin,
  country,
  city
) VALUES (
  '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid,
  'admin'::user_role,
  NULL,
  'owner@gmail.com',
  NULL,
  'Tunisia',
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  country = EXCLUDED.country;

-- Verify the profile was created
SELECT * FROM public.profiles WHERE id = '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid;
