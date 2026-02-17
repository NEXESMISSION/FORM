# دليل حذف المستخدمين — User Deletion Guide

## المشكلة
عند محاولة حذف المستخدمين من Supabase Dashboard → Authentication → Users، قد تظهر رسالة خطأ:
```
Failed to delete selected users: Database error deleting user
```

## السبب
- جدول `public.profiles` يحتوي على foreign key يشير إلى `auth.users(id)`
- حذف المستخدم من `auth.users` قد يفشل إذا كان هناك بيانات مرتبطة
- RLS (Row Level Security) قد يمنع الحذف

## الحلول

### ✅ الحل 1: حذف من profiles أولاً (الأسهل)

1. **افتح Supabase SQL Editor**
2. **نفّذ السكريبت التالي:**

```sql
-- حذف كل الملفات ما عدا الحساب المطلوب
DELETE FROM public.profiles
WHERE id <> '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid;
```

3. **ثم اذهب إلى Dashboard → Authentication → Users**
4. **احذف المستخدمين يدوياً** (الآن يجب أن يعمل بدون مشاكل)

### ✅ الحل 2: استخدام السكريبت الكامل

نفّذ ملف `supabase/DELETE_USERS_SAFE.sql` في SQL Editor:

```sql
-- هذا السكريبت يحذف من profiles أولاً ثم يعطيك تعليمات للحذف من auth.users
```

### ✅ الحل 3: حذف واحد تلو الآخر

إذا كان لديك عدد قليل من المستخدمين:

1. **احذف من profiles:**
```sql
DELETE FROM public.profiles WHERE id = 'USER_ID_HERE'::uuid;
```

2. **ثم احذف من Dashboard → Authentication → Users**

### ✅ الحل 4: استخدام Service Role (للمطورين المتقدمين)

إذا كنت تريد حذف من `auth.users` مباشرة عبر SQL:

1. **استخدم Service Role Key** (لا تعرضه في الكود!)
2. **نفّذ:**

```sql
-- هذا يتطلب صلاحيات Service Role
DELETE FROM auth.users
WHERE id <> '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid;
```

## التحقق من النجاح

بعد الحذف، تحقق:

```sql
-- عدد الملفات المتبقية
SELECT COUNT(*) FROM public.profiles;

-- عرض الملفات المتبقية
SELECT id, role, email, phone_number 
FROM public.profiles;

-- التحقق من وجود الحساب المطلوب
SELECT * FROM public.profiles 
WHERE id = '0080255d-cbd7-48a0-86e6-60dfa4172881'::uuid;
```

## ملاحظات مهمة

⚠️ **تحذير:**
- الحذف نهائي ولا يمكن التراجع عنه
- تأكد من نسخ احتياطي للبيانات المهمة قبل الحذف
- الحساب `0080255d-cbd7-48a0-86e6-60dfa4172881` سيتم الإبقاء عليه

✅ **نصيحة:**
- احذف من `public.profiles` أولاً دائماً
- ثم احذف من `auth.users` عبر Dashboard أو SQL
- هذا يضمن عدم وجود أخطاء foreign key

## إذا استمرت المشكلة

1. **تحقق من RLS Policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

2. **تحقق من Foreign Keys:**
```sql
SELECT * FROM information_schema.table_constraints 
WHERE table_name = 'profiles' AND constraint_type = 'FOREIGN KEY';
```

3. **اتصل بدعم Supabase** إذا كانت المشكلة مستمرة
