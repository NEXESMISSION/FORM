# تطبيق Migration للـ Intro Onboarding

## المشكلة
العمود `has_seen_intro` غير موجود في جدول `profiles` في قاعدة البيانات.

## الحل

### الطريقة 1: استخدام Supabase Dashboard (موصى به)

1. افتح [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى **SQL Editor** من القائمة الجانبية
4. انسخ والصق محتوى ملف `add_intro_onboarding_field.sql`
5. اضغط **Run** أو **Execute**

### الطريقة 2: استخدام Supabase CLI

إذا كان لديك Supabase CLI مثبت:

```bash
supabase db push
```

أو:

```bash
psql -h [YOUR_DB_HOST] -U postgres -d postgres -f supabase/add_intro_onboarding_field.sql
```

## ملف SQL المطلوب

الملف موجود في: `supabase/add_intro_onboarding_field.sql`

المحتوى:
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_seen_intro BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_has_seen_intro ON public.profiles(has_seen_intro);
```

## ملاحظة

الكود الآن يدعم **fallback إلى localStorage** إذا كان العمود غير موجود، لكن يُفضل تطبيق الـ migration للحصول على تجربة أفضل ومزامنة البيانات عبر الأجهزة.

## التحقق من التطبيق

بعد تطبيق الـ migration، تأكد من:
1. عدم وجود أخطاء في Console
2. أن الـ intro يظهر للمستخدمين الجدد فقط
3. أن الحالة تُحفظ في قاعدة البيانات وليس فقط في localStorage
