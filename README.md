# DOMOBAT — برنامج السكن الاقتصادي السريع

منصة رقمية لاستمارة السكن الاقتصادي: تسجيل، استمارة رقمية، طلبات شراء مباشر، ولوحة إدارة.

## Stack

- **Next.js 14** (App Router)
- **React 18**, **TypeScript**
- **Tailwind CSS**
- **Supabase** (Auth, Database, Storage)
- **PWA** (manifest + installable)

## التطوير المحلي

```bash
npm install
cp .env.example .env.local
# أضف NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في .env.local
npm run dev
```

## النشر على Vercel

1. اربط المستودع من [Vercel](https://vercel.com) → Import Git Repository → اختر `NEXESMISSION/FORM`.
2. أضف متغيرات البيئة في Vercel (Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (اختياري) `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy. الـ Build Command: `npm run build` (افتراضي).

## PWA

- الموقع قابل للإضافة إلى الشاشة الرئيسية (Add to Home Screen).
- `public/manifest.json` مضبوط مع `scope`, `theme_color`, أيقونات 192/512.
- في production يمكن تثبيت التطبيق من المتصفح.

## قاعدة البيانات

نفّذ سكربتات Supabase في المشروع (مثل `supabase/UPDATE_DATABASE_FULL.sql`) من Supabase SQL Editor لإنشاء الجداول والسياسات.

## الترخيص

© 2026 DOMOBAT.
