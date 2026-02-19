# Chat API Troubleshooting Guide

## المشاكل المحتملة وإصلاحاتها

### 1. خطأ 404 (Not Found)

**الأعراض:**
- `POST http://localhost:3000/api/chat 404 (Not Found)`
- رسالة: "خدمة الدردشة غير متاحة حالياً"

**الأسباب المحتملة:**
1. **Next.js dev server لم يتعرف على المسار**
   - **الحل:** أعد تشغيل الخادم وحذف مجلد `.next`
   ```powershell
   # أوقف الخادم (Ctrl+C)
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

2. **ملف المسار غير موجود أو في مكان خاطئ**
   - **التحقق:** تأكد من وجود `app/api/chat/route.ts`
   - **الحل:** تأكد من أن الملف موجود في المسار الصحيح

3. **مشكلة في Turbo mode**
   - **الحل:** جرّب تشغيل بدون `--turbo`:
   ```bash
   next dev
   ```

4. **خطأ في تصدير الدالة**
   - **التحقق:** تأكد من وجود `export async function POST` و `export async function GET`
   - **الحل:** استخدم نفس التنسيق المستخدم في `app/api/build-id/route.ts`

### 2. خطأ 500 (Internal Server Error)

**الأعراض:**
- `POST http://localhost:3000/api/chat 500 (Internal Server Error)`
- رسالة: "حدث خطأ. جرّب لاحقاً"

**الأسباب المحتملة:**

1. **مفتاح API مفقود أو غير صحيح**
   - **التحقق:** تأكد من وجود `OPENAI_API_KEY` في `.env.local`
   ```bash
   # في .env.local
   OPENAI_API_KEY=sk-proj-...
   ```
   - **الحل:** أضف المفتاح الصحيح من OpenAI

2. **خطأ في استيراد الوحدات**
   - **التحقق:** تأكد من وجود الملفات التالية:
     - `lib/security/rateLimiting.ts`
     - `lib/security/sanitization.ts`
     - `lib/utils/chatContext.ts`
   - **الحل:** تأكد من أن جميع الملفات موجودة وصحيحة

3. **خطأ في `sanitizeInput`**
   - **الأعراض:** خطأ عند تنظيف المدخلات
   - **الحل:** تمت إضافة معالجة أخطاء، لكن تأكد من أن `isomorphic-dompurify` مثبت:
   ```bash
   npm install isomorphic-dompurify
   ```

4. **خطأ في `apiRateLimit`**
   - **الأعراض:** خطأ عند التحقق من rate limit
   - **الحل:** تمت إضافة معالجة أخطاء، لكن تأكد من أن الدالة موجودة

5. **خطأ في `detectIntent`**
   - **الأعراض:** خطأ عند اكتشاف النية
   - **الحل:** تمت إضافة معالجة أخطاء، لكن تأكد من أن الدالة موجودة

6. **خطأ في OpenAI API**
   - **الأعراض:** خطأ 502 أو خطأ من OpenAI
   - **التحقق:** تحقق من:
     - صحة مفتاح API
     - رصيد حساب OpenAI
     - اتصال بالإنترنت
   - **الحل:** تحقق من OpenAI Dashboard

### 3. خطأ 503 (Service Unavailable)

**الأعراض:**
- رسالة: "Chat غير مفعّل. أضف OPENAI_API_KEY في .env.local"

**السبب:**
- `OPENAI_API_KEY` غير موجود في متغيرات البيئة

**الحل:**
1. أنشئ ملف `.env.local` في جذر المشروع
2. أضف السطر التالي:
   ```
   OPENAI_API_KEY=sk-proj-your-key-here
   ```
3. أعد تشغيل الخادم

### 4. خطأ 429 (Too Many Requests)

**الأعراض:**
- رسالة: "Too many requests. Please try again later."

**السبب:**
- تجاوز حد الطلبات المسموح (60 طلب في الدقيقة)

**الحل:**
- انتظر دقيقة واحدة ثم جرّب مرة أخرى

### 5. الدردشة لا تستجيب أو تتجمد

**الأسباب المحتملة:**

1. **OpenAI API بطيء**
   - **الحل:** انتظر قليلاً، قد يستغرق الرد بضع ثوانٍ

2. **خطأ في الشبكة**
   - **التحقق:** تحقق من اتصال الإنترنت
   - **الحل:** تأكد من الاتصال بالإنترنت

3. **مشكلة في CORS**
   - **التحقق:** تحقق من `next.config.js` - يجب أن يكون `connect-src` يتضمن `https://api.openai.com`
   - **الحل:** تأكد من أن CSP يتضمن:
   ```
   "connect-src 'self' https://*.supabase.co https://api.openai.com"
   ```

### 6. أيقونة الدردشة لا تظهر أو لا تعمل

**الأسباب المحتملة:**

1. **مشكلة في CSS**
   - **التحقق:** تحقق من أن الأيقونة مرئية
   - **الحل:** تأكد من أن `ChatWidget` موجود في `app/layout.tsx`

2. **مشكلة في z-index**
   - **التحقق:** تأكد من أن `z-index` عالي enough
   - **الحل:** تم تعيينه إلى `z-[9999]`

3. **مشكلة في الموضع**
   - **التحقق:** تحقق من أن الأيقونة ليست مخفية خلف عناصر أخرى
   - **الحل:** تم تعديل الموضع ليرتفع عند فتح صندوق الدردشة

### 7. الرسائل لا تُحفظ

**الأسباب المحتملة:**

1. **مشكلة في localStorage**
   - **التحقق:** تحقق من أن المتصفح يدعم localStorage
   - **الحل:** تأكد من أنك لست في وضع التصفح الخاص

2. **مشكلة في `useLocalStorage` hook**
   - **التحقق:** تأكد من وجود `lib/hooks.ts` أو `lib/hooks/index.ts`
   - **الحل:** تأكد من أن الـ hook موجود وصحيح

### 8. مشاكل في التجميع (Build Issues)

**الأعراض:**
- أخطاء TypeScript عند التجميع
- المسار لا يعمل في production

**الحل:**
1. تحقق من أخطاء TypeScript:
   ```bash
   npm run type-check
   ```

2. تأكد من أن جميع الاستيرادات صحيحة

3. تأكد من أن جميع التبعيات مثبتة:
   ```bash
   npm install
   ```

## خطوات التحقق السريعة

1. **تحقق من وجود الملف:**
   ```powershell
   Test-Path "app\api\chat\route.ts"
   ```

2. **تحقق من وجود API Key:**
   ```powershell
   Get-Content .env.local | Select-String "OPENAI"
   ```

3. **تحقق من التجميع:**
   ```bash
   npm run build
   ```

4. **اختبر المسار مباشرة:**
   - افتح `http://localhost:3000/api/chat` في المتصفح
   - يجب أن ترى: `{"status":"ok","message":"Chat API is running","hasApiKey":true}`

5. **تحقق من Terminal:**
   - ابحث عن أخطاء في Terminal عند إرسال رسالة
   - يجب أن ترى رسائل `console.error` إذا كان هناك خطأ

## هيكل الملف المطلوب

```
app/
  api/
    chat/
      route.ts  ← يجب أن يحتوي على:
        - export async function GET()
        - export async function POST(request: NextRequest)
```

## المتطلبات

1. **متغيرات البيئة:**
   - `OPENAI_API_KEY` في `.env.local`

2. **التبعيات:**
   - `isomorphic-dompurify` (لـ sanitizeInput)
   - جميع ملفات `lib/security/*` و `lib/utils/chatContext.ts`

3. **Next.js Configuration:**
   - `next.config.js` يجب أن يسمح بـ `https://api.openai.com` في CSP

## نصائح إضافية

1. **استخدم GET endpoint للاختبار:**
   - افتح `http://localhost:3000/api/chat` مباشرة
   - إذا رأيت JSON response، المسار يعمل

2. **تحقق من Console في المتصفح:**
   - افتح Developer Tools (F12)
   - اذهب إلى Console
   - ابحث عن أخطاء JavaScript

3. **تحقق من Network Tab:**
   - افتح Developer Tools (F12)
   - اذهب إلى Network
   - جرّب إرسال رسالة
   - انقر على طلب `/api/chat`
   - تحقق من Response و Status Code

4. **تحقق من Server Logs:**
   - انظر إلى Terminal حيث يعمل `npm run dev`
   - ابحث عن أخطاء أو warnings

## إذا لم يعمل أي شيء

1. **احذف `.next` وأعد التجميع:**
   ```powershell
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

2. **تحقق من إصدارات الحزم:**
   ```bash
   npm list next react react-dom
   ```

3. **أعد تثبيت التبعيات:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **جرّب بدون Turbo:**
   - عدّل `package.json`:
   ```json
   "dev": "next dev"
   ```
   - بدلاً من:
   ```json
   "dev": "next dev --turbo"
   ```

## حالة الملفات الحالية

- ✅ `app/api/chat/route.ts` موجود وصحيح
- ✅ `components/ChatWidget.tsx` موجود ويستخدم `/api/chat`
- ✅ معالجة أخطاء شاملة في route handler
- ✅ GET endpoint للاختبار

## ملاحظات مهمة

- المسار يستخدم `export async function` وليس `export const`
- تمت إضافة معالجة أخطاء لجميع العمليات الحساسة
- المسار يعمل في `nodejs` runtime
- يجب أن يكون `OPENAI_API_KEY` موجود في `.env.local` وليس `.env`

## كيفية قراءة الأخطاء من Terminal

عند حدوث خطأ 500، يجب أن ترى في Terminal رسائل مثل:

```
Chat API error: [Error object]
Error stack: [Stack trace]
Error name: [Error name]
Error message: [Error message]
```

**أمثلة على أخطاء شائعة:**

1. **"Cannot find module '@/lib/security/rateLimiting'"**
   ```
   Error: Cannot find module '@/lib/security/rateLimiting'
   ```
   - **الحل:** تحقق من `tsconfig.json` paths

2. **"sanitizeInput is not a function"**
   ```
   TypeError: sanitizeInput is not a function
   ```
   - **الحل:** تحقق من `lib/security/sanitization.ts` exports

3. **"OPENAI_API_KEY is undefined"**
   ```
   Error message: Chat غير مفعّل
   ```
   - **الحل:** أضف `OPENAI_API_KEY` إلى `.env.local`

4. **"fetch failed"**
   ```
   Error: fetch failed
   Error: connect ECONNREFUSED
   ```
   - **الحل:** مشكلة في الاتصال بـ OpenAI API (تحقق من الإنترنت)

5. **"Invalid API key"**
   ```
   OpenAI API error: 401 Unauthorized
   ```
   - **الحل:** مفتاح API غير صحيح أو منتهي الصلاحية

## خطوات التشخيص التفصيلية

### 1. تحقق من أن المسار يعمل (GET Request)

افتح في المتصفح:
```
http://localhost:3000/api/chat
```

**النتيجة المتوقعة:**
```json
{
  "status": "ok",
  "message": "Chat API is running",
  "hasApiKey": true
}
```

**إذا رأيت 404:**
- المسار غير موجود أو لم يتم تجميعه
- احذف `.next` وأعد التشغيل

**إذا رأيت 500:**
- هناك خطأ في الكود
- تحقق من Terminal للأخطاء

### 2. تحقق من Terminal عند إرسال رسالة

عند إرسال رسالة، يجب أن ترى في Terminal:
- `POST /api/chat` مع status code
- أي `console.error` messages

**أخطاء شائعة في Terminal:**

1. **"Cannot find module '@/lib/security/rateLimiting'"**
   - **الحل:** تأكد من أن `tsconfig.json` يحتوي على paths صحيحة

2. **"sanitizeInput is not a function"**
   - **الحل:** تأكد من أن `lib/security/sanitization.ts` يصدر `sanitizeInput`

3. **"detectIntent is not a function"**
   - **الحل:** تأكد من أن `lib/utils/chatContext.ts` يصدر `detectIntent`

4. **"OPENAI_API_KEY is undefined"**
   - **الحل:** أضف المفتاح إلى `.env.local` وأعد تشغيل الخادم

### 3. تحقق من Browser Console

افتح Developer Tools (F12) → Console:

**أخطاء شائعة:**

1. **"Failed to fetch"**
   - المسار غير موجود أو الخادم متوقف
   - **الحل:** تأكد من أن الخادم يعمل

2. **CORS error**
   - مشكلة في CSP headers
   - **الحل:** تحقق من `next.config.js`

3. **Network error**
   - مشكلة في الاتصال
   - **الحل:** تحقق من الإنترنت

### 4. تحقق من Network Tab

Developer Tools → Network → جرّب إرسال رسالة:

**تحقق من:**
- Request URL: `http://localhost:3000/api/chat`
- Request Method: `POST`
- Status Code: يجب أن يكون 200 (نجاح) أو 4xx/5xx (خطأ)
- Response: JSON object

**إذا كان Status 404:**
- المسار غير موجود
- احذف `.next` وأعد التشغيل

**إذا كان Status 500:**
- هناك خطأ في server-side code
- تحقق من Terminal

**إذا كان Status 503:**
- `OPENAI_API_KEY` مفقود
- أضفه إلى `.env.local`

## قائمة التحقق السريعة

- [ ] ملف `app/api/chat/route.ts` موجود
- [ ] ملف `.env.local` يحتوي على `OPENAI_API_KEY`
- [ ] الخادم يعمل (`npm run dev`)
- [ ] GET `/api/chat` يعمل (افتح في المتصفح)
- [ ] لا توجد أخطاء في Terminal
- [ ] لا توجد أخطاء في Browser Console
- [ ] `isomorphic-dompurify` مثبت (`npm list isomorphic-dompurify`)
- [ ] جميع ملفات `lib/security/*` موجودة
- [ ] `lib/utils/chatContext.ts` موجود

## الأوامر المفيدة

```powershell
# التحقق من وجود الملف
Test-Path "app\api\chat\route.ts"

# التحقق من API Key
Get-Content .env.local | Select-String "OPENAI"

# التحقق من التبعيات
npm list isomorphic-dompurify

# إعادة بناء كاملة
Remove-Item -Recurse -Force .next
npm run dev

# فحص TypeScript
npm run type-check

# بناء المشروع
npm run build
```

## إذا استمرت المشكلة

1. **تحقق من logs في Terminal** - ابحث عن `console.error`
2. **تحقق من Browser Console** - ابحث عن JavaScript errors
3. **تحقق من Network Tab** - انظر إلى Request/Response
4. **اختبر GET endpoint** - `http://localhost:3000/api/chat`
5. **تحقق من `.env.local`** - تأكد من وجود `OPENAI_API_KEY`

## معلومات إضافية

- **Port:** تأكد من أن الخادم يعمل على المنفذ الصحيح (3000 أو 3001)
- **Turbo Mode:** قد يسبب مشاكل - جرّب بدون `--turbo`
- **Hot Reload:** قد لا يعمل دائماً - أعد تشغيل الخادم عند الحاجة
