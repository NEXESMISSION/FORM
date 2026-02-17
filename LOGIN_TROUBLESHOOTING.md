# Login Troubleshooting Guide

## Common Login Errors

### 400 Bad Request Error

**Possible Causes:**

1. **Email Not Confirmed**
   - Supabase requires email confirmation by default
   - Solution: Check your email and click the confirmation link
   - Or disable email confirmation in Supabase Dashboard → Authentication → Settings

2. **Invalid Credentials**
   - Wrong email or password
   - Solution: Double-check your credentials
   - Try resetting password if needed

3. **Account Doesn't Exist**
   - Email not registered
   - Solution: Register first at `/auth/register`

4. **Email Format Issue**
   - Invalid email format
   - Solution: Ensure email is valid (e.g., `user@example.com`)

## Quick Fixes

### Option 1: Disable Email Confirmation (Development)

1. Go to Supabase Dashboard
2. Authentication → Settings
3. Disable "Enable email confirmations"
4. Save changes
5. Try logging in again

### Option 2: Confirm Your Email

1. Check your email inbox (and spam folder)
2. Look for email from Supabase
3. Click the confirmation link
4. Try logging in again

### Option 3: Check User Exists

1. Go to Supabase Dashboard → Authentication → Users
2. Check if your email is listed
3. If not, register first
4. If yes, verify email is confirmed

## Testing Login

1. **Register First**: Go to `/auth/register` and create an account
2. **Check Email**: Confirm your email if required
3. **Login**: Use the same email and password you registered with

## Still Having Issues?

Check browser console (F12) for detailed error messages. The improved error handling will show:
- "Invalid email or password" - Wrong credentials
- "Email not confirmed" - Need to confirm email
- "User not found" - Need to register first
