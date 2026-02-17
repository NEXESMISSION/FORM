# Admin User Setup Guide

## Problem
If you manually created an admin profile in the database (via SQL), you may encounter login issues because:
1. The profile exists in `public.profiles` table
2. But there's no corresponding user in `auth.users` table
3. Or the password is unknown

## Solution: Create Admin User Properly

### Option 1: Create via Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Enter:
   - Email: `owner@gmail.com` (or your admin email)
   - Password: Choose a strong password
   - Auto Confirm User: ✅ (check this)
4. Copy the User ID (UUID)
5. Run this SQL in the SQL Editor (replace `USER_ID_HERE` with the UUID from step 4):

```sql
-- Insert or update the profile for the admin user
INSERT INTO public.profiles (id, role, phone_number, email, cin, country, city)
VALUES (
  'USER_ID_HERE',  -- Replace with actual UUID
  'admin',
  '+21600000000',  -- Replace with actual phone number
  'owner@gmail.com',
  NULL,
  'Tunisia',
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  email = EXCLUDED.email,
  phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number);
```

### Option 2: Create via Registration Flow

1. Register a new account through the app at `/auth/register`
2. Use the email you want for admin: `owner@gmail.com`
3. Complete the registration process
4. After registration, update the role to admin in Supabase SQL Editor:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'owner@gmail.com';
```

### Option 3: Use Service Role Key (Advanced)

If you need to create the auth user programmatically, you can use the service role key in a server-side script or API route. **Never expose the service role key in client-side code.**

## Troubleshooting Login Issues

### Error: "Invalid login credentials"
- **Cause**: Wrong email/password, or user doesn't exist in `auth.users`
- **Solution**: 
  - Verify the email exists in Supabase Dashboard → Authentication → Users
  - Reset password if needed (Dashboard → Authentication → Users → Reset Password)
  - Or create a new account via registration

### Error: "Profile fetch error: PGRST116"
- **Cause**: Profile doesn't exist in `public.profiles` but user exists in `auth.users`
- **Solution**: The dashboard will automatically create the profile, or you can create it manually:

```sql
INSERT INTO public.profiles (id, role, phone_number, email)
VALUES (
  'USER_ID_FROM_AUTH_USERS',
  'applicant',  -- or 'admin', 'investor'
  '+21600000000',
  'user@example.com'
);
```

### Error: "duplicate key value violates unique constraint"
- **Cause**: Profile already exists but can't be read (RLS issue) or there's a mismatch
- **Solution**: 
  - Check RLS policies are correctly set up (run `supabase/fix_rls_policy.sql`)
  - Verify the user is authenticated correctly
  - Try updating the profile instead:

```sql
UPDATE public.profiles
SET email = 'owner@gmail.com',
    role = 'admin'
WHERE id = '0080255d-cbd7-48a0-86e6-60dfa4172881';
```

## Verify Admin User Setup

After creating the admin user, verify:

1. **User exists in auth.users**:
   ```sql
   SELECT id, email, email_confirmed_at 
   FROM auth.users 
   WHERE email = 'owner@gmail.com';
   ```

2. **Profile exists and has admin role**:
   ```sql
   SELECT id, role, email, phone_number 
   FROM public.profiles 
   WHERE email = 'owner@gmail.com';
   ```

3. **Can log in**: Try logging in with the email and password

## Security Notes

- Always use strong passwords for admin accounts
- Never share admin credentials
- Consider enabling 2FA for admin accounts (if available)
- Regularly audit admin users and remove unused accounts
