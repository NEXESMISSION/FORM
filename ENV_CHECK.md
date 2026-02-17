# Environment Variables Check

If you're seeing "supabaseKey is required" errors, follow these steps:

## 1. Verify .env.local File Exists

Make sure `.env.local` exists in the root directory with these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://alhlkagkxsngaisepkfo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 2. Restart Next.js Dev Server

**IMPORTANT**: After creating or modifying `.env.local`, you MUST restart the Next.js dev server:

1. Stop the current server (Ctrl+C)
2. Run `npm run dev` again

Environment variables are only loaded when Next.js starts.

## 3. Check for Typos

Make sure there are:
- No spaces around the `=` sign
- No quotes around the values (unless the value itself contains spaces)
- No trailing spaces

## 4. Verify File Location

The `.env.local` file must be in the root directory:
```
form webapp domobat/
├── .env.local          ← Must be here
├── package.json
├── next.config.js
└── ...
```

## 5. Clear Next.js Cache

If issues persist, try clearing the cache:

```bash
# Delete .next folder
rm -rf .next

# Or on Windows:
rmdir /s .next

# Then restart
npm run dev
```

## 6. Check Browser Console

Open browser DevTools and check:
- Are there any errors about missing environment variables?
- Check Network tab to see if requests are being made

## Quick Fix Command

```bash
# Stop server (Ctrl+C), then:
cd "C:\Users\Med Saief Allah\Desktop\form webapp domobat"
npm run dev
```

The server should now pick up your environment variables!
