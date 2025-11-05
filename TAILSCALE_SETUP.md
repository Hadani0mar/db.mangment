# إعداد Tailscale Funnel مع OAuth

## المشكلة

عند استخدام Tailscale Funnel مع رابط مثل `https://my-laptop.tail045981.ts.net/`، عند محاولة تسجيل الدخول، يتم إعادة التوجيه إلى `localhost` بدلاً من رابط Tailscale.

## الحل

تم تعديل الكود لاستخدام `origin` من الطلب الفعلي، مما يعني أنه سيعمل تلقائياً مع:
- ✅ `localhost:3000`
- ✅ `192.168.0.114:3000` (IP محلي)
- ✅ `https://my-laptop.tail045981.ts.net/` (Tailscale Funnel)

## الإعدادات المطلوبة

### 1. إعداد Supabase Redirect URLs

1. اذهب إلى [Supabase Dashboard](https://app.supabase.com)
2. اختر مشروعك
3. اذهب إلى **Authentication** > **URL Configuration**
4. أضف في **Redirect URLs** جميع الروابط التالية:

```
http://localhost:3000/auth/callback
https://my-laptop.tail045981.ts.net/auth/callback
```

**ملاحظة**: إذا كان لديك أجهزة متعددة أو روابط Tailscale مختلفة، أضف كل رابط.

### 2. إعداد Google OAuth

#### في Google Cloud Console:

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** > **Credentials**
3. اختر OAuth 2.0 Client ID الخاص بك
4. في **Authorized redirect URIs**، أضف:

```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

**ملاحظة**: Google OAuth يستخدم Supabase callback URL دائماً، وليس رابط موقعك مباشرة. Supabase هو الذي يتعامل مع إعادة التوجيه.

### 3. متغيرات البيئة (اختياري)

في ملف `.env.local`، يمكنك إضافة:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SITE_URL=https://my-laptop.tail045981.ts.net
```

**ملاحظة**: الآن الكود لا يعتمد على `NEXT_PUBLIC_SITE_URL` لأنه يستخدم `origin` من الطلب الفعلي. لكن يمكنك الاحتفاظ به للتوافق مع الكود القديم.

## تشغيل Tailscale Funnel

### 1. تشغيل Next.js على المنفذ 3000

```bash
npm run dev
```

أو للشبكة المحلية:

```bash
npm run dev:network
```

### 2. تشغيل Tailscale Funnel

#### في المقدمة (foreground):
```bash
tailscale funnel 3000
```

#### في الخلفية (background):
```bash
tailscale funnel --bg 3000
```

ستحصل على رابط مثل:
```
https://my-laptop.tail045981.ts.net/
```

### 3. إيقاف Tailscale Funnel

```bash
tailscale funnel reset
```

## التحقق من الإعدادات

### 1. التحقق من حالة Funnel

```bash
tailscale funnel status
```

### 2. اختبار تسجيل الدخول

1. افتح رابط Tailscale في المتصفح
2. اضغط على "تسجيل الدخول مع Google"
3. يجب أن يعيدك إلى نفس رابط Tailscale بعد تسجيل الدخول

## استكشاف الأخطاء

### المشكلة: لا يزال يعيد التوجيه إلى localhost

**الحل**:
1. تأكد من إضافة رابط Tailscale في Supabase Redirect URLs
2. امسح الكاش في المتصفح
3. تأكد من أن السيرفر يعمل على المنفذ 3000

### المشكلة: خطأ في OAuth

**الحل**:
1. تحقق من أن Google OAuth مفعّل في Supabase
2. تأكد من إضافة Supabase callback URL في Google Cloud Console
3. تحقق من أن Client ID و Client Secret صحيحة

### المشكلة: Funnel لا يعمل

**الحل**:
```bash
# إعادة تعيين Funnel
tailscale funnel reset

# إعادة تشغيل Funnel
tailscale funnel 3000
```

## الأمان

⚠️ **تحذير**: Tailscale Funnel يجعل موقعك متاحاً على الإنترنت. تأكد من:
- استخدام HTTPS دائماً (Tailscale Funnel يوفر HTTPS تلقائياً)
- عدم مشاركة الرابط مع أشخاص غير موثوقين
- إيقاف Funnel عند عدم الحاجة

## روابط مفيدة

- [Tailscale Funnel Documentation](https://tailscale.com/kb/1247/funnel-serve-use-cases)
- [Supabase OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)



