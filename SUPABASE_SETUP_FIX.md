# Fixing Supabase 400 Error

## Common Causes and Solutions

### 1. Database Schema Not Updated

**Problem**: The `profiles` table doesn't have the new columns (email, cin, country, city).

**Solution**: Run the migration SQL in your Supabase SQL Editor:

```sql
-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS cin TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Tunisia',
ADD COLUMN IF NOT EXISTS city TEXT;

-- Update existing profiles to have default country
UPDATE public.profiles 
SET country = 'Tunisia' 
WHERE country IS NULL;
```

### 2. Email Confirmation Required

**Problem**: Supabase requires email confirmation before account is active.

**Solution**: 
- Option A: Disable email confirmation (for development)
  1. Go to Supabase Dashboard → Authentication → Settings
  2. Disable "Enable email confirmations"
  3. Save changes

- Option B: Keep email confirmation (for production)
  - Users will receive confirmation email
  - They need to click the link before logging in
  - The app handles this gracefully

### 3. Invalid Email Format

**Problem**: Email validation fails.

**Solution**: Ensure email is in valid format (e.g., `user@example.com`)

### 4. Duplicate Email/Phone

**Problem**: User already exists with that email or phone.

**Solution**: 
- Check if user exists in Supabase Auth → Users
- Use a different email/phone
- Or login instead of registering

### 5. RLS (Row Level Security) Policies

**Problem**: RLS policies blocking profile creation.

**Solution**: Ensure RLS policies allow profile creation:

```sql
-- Check if this policy exists
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

## Quick Fix Steps

1. **Run Migration**:
   ```sql
   -- Copy and run in Supabase SQL Editor
   ALTER TABLE public.profiles 
   ADD COLUMN IF NOT EXISTS email TEXT,
   ADD COLUMN IF NOT EXISTS cin TEXT,
   ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Tunisia',
   ADD COLUMN IF NOT EXISTS city TEXT;
   ```

2. **Check Supabase Settings**:
   - Go to Authentication → Settings
   - Check "Enable email confirmations" setting
   - For development, you can disable it

3. **Check Error Details**:
   - Open browser console (F12)
   - Look for detailed error messages
   - The improved error handling will show specific issues

4. **Verify Database**:
   - Go to Table Editor → profiles
   - Check if columns exist
   - Verify RLS policies are set

## Testing

After fixing:

1. Try registering with a new email
2. Check browser console for detailed errors
3. Check Supabase Dashboard → Authentication → Users
4. Check Supabase Dashboard → Table Editor → profiles

## Still Having Issues?

Check the browser console for the exact error message. The improved error handling will show:
- Specific validation errors
- Database constraint violations
- Authentication issues

Share the exact error message from the console for more specific help.
