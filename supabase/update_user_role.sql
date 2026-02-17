-- Update user role to investor for quikasalami@gmail.com
-- Run this in Supabase SQL Editor

UPDATE public.profiles
SET role = 'investor'
WHERE email = 'quikasalami@gmail.com';

-- Verify the update
SELECT id, email, role, phone_number 
FROM public.profiles 
WHERE email = 'quikasalami@gmail.com';
