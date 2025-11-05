# إعداد Supabase لتسجيل الدخول بـ Google

## الخطوات المطلوبة:

### 1. إنشاء ملف `.env.local` في المجلد الرئيسي:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. الحصول على معلومات Supabase:

1. انتقل إلى [Supabase Dashboard](https://app.supabase.com)
2. اختر مشروعك
3. اذهب إلى **Settings** > **API**
4. انسخ:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. إعداد Google OAuth في Supabase:

1. في Supabase Dashboard، اذهب إلى **Authentication** > **Providers**
2. فعّل **Google** provider
3. أدخل:
   - **Client ID** من Google Cloud Console
   - **Client Secret** من Google Cloud Console
4. أضف Redirect URL:
   ```
   http://localhost:3000/auth/callback
   ```
   (للاستخدام في الإنتاج، أضف URL الإنتاج أيضاً)

### 4. إعداد Google Cloud Console:

1. انتقل إلى [Google Cloud Console](https://console.cloud.google.com)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. اذهب إلى **APIs & Services** > **Credentials**
4. أنشئ **OAuth 2.0 Client ID**
5. أضف **Authorized redirect URIs**:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   (يمكنك العثور على هذا الرابط في Supabase Dashboard > Authentication > URL Configuration)
6. انسخ **Client ID** و **Client Secret** إلى Supabase

### 5. تشغيل المشروع:

```bash
npm run dev
```

الآن يمكن للمستخدمين تسجيل الدخول باستخدام Google!

## الملفات المضافة:

- `src/lib/supabase/client.ts` - عميل Supabase للعميل (Browser)
- `src/lib/supabase/server.ts` - عميل Supabase للخادم (Server)
- `src/app/auth/callback/route.ts` - معالج callback بعد تسجيل الدخول
- `src/app/api/auth/signin/route.ts` - API route لتسجيل الدخول (اختياري)

## ملاحظات:

- تأكد من أن Google OAuth مفعّل في Supabase
- تأكد من إضافة Redirect URLs بشكل صحيح
- في الإنتاج، غيّر `NEXT_PUBLIC_SITE_URL` إلى URL الإنتاج

