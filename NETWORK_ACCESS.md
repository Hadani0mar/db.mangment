# الوصول للموقع من نفس الشبكة

## الطريقة السريعة

### 1. تشغيل السيرفر على الشبكة المحلية

بدلاً من `npm run dev`، استخدم:

```bash
npm run dev:network
```

أو مباشرة:

```bash
next dev -H 0.0.0.0
```

### 2. معرفة عنوان IP المحلي

#### على Windows:
```bash
ipconfig
```
ابحث عن **IPv4 Address** في قسم **Ethernet adapter** أو **Wireless LAN adapter**

مثال: `192.168.1.100`

#### على Mac/Linux:
```bash
ifconfig
```
أو
```bash
ip addr show
```
ابحث عن `inet` في قسم `wlan0` (WiFi) أو `eth0` (Ethernet)

### 3. الوصول من جهاز آخر

من أي جهاز في نفس الشبكة، افتح المتصفح وأدخل:

```
http://YOUR_IP_ADDRESS:3000
```

مثال:
```
http://192.168.1.100:3000
```

## ملاحظات مهمة

### 1. Firewall (جدار الحماية)

قد تحتاج لإضافة استثناء في Firewall:

#### Windows:
1. افتح **Windows Defender Firewall**
2. اضغط **Allow an app or feature**
3. ابحث عن **Node.js** أو أضف استثناء جديد للمنفذ **3000**

أو من PowerShell (كمسؤول):
```powershell
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

#### Mac:
```bash
# في System Preferences > Security & Privacy > Firewall
# أو من Terminal:
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

### 2. إعدادات Supabase

تأكد من إضافة IP المحلي في إعدادات Supabase OAuth:

1. اذهب إلى [Supabase Dashboard](https://app.supabase.com)
2. **Authentication** > **URL Configuration**
3. أضف في **Redirect URLs**:
   ```
   http://YOUR_IP_ADDRESS:3000/auth/callback
   ```

### 3. إعدادات Google OAuth

إذا كنت تستخدم Google OAuth، أضف في Google Cloud Console:

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** > **Credentials**
3. في OAuth 2.0 Client ID، أضف في **Authorized redirect URIs**:
   ```
   http://YOUR_IP_ADDRESS:3000/auth/callback
   ```

**ملاحظة**: قد لا تعمل Google OAuth مع IP محلي. في هذه الحالة، استخدم `localhost` على الجهاز الرئيسي فقط.

### 4. متغيرات البيئة

تأكد من أن `.env.local` يحتوي على:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SITE_URL=http://YOUR_IP_ADDRESS:3000
```

## الأمان

⚠️ **تحذير**: عند تشغيل السيرفر على `0.0.0.0`، يمكن لأي شخص في نفس الشبكة الوصول للتطبيق. استخدم هذا فقط للتطوير والاختبار.

## استكشاف الأخطاء

### المشكلة: لا يمكن الوصول من جهاز آخر

**الحلول**:
1. تأكد من أن الجهازين في نفس الشبكة (WiFi أو Ethernet)
2. تحقق من Firewall
3. تأكد من استخدام IP الصحيح وليس `localhost`
4. جرب `ping` من الجهاز الثاني:
   ```bash
   ping YOUR_IP_ADDRESS
   ```

### المشكلة: Connection Refused

**الحلول**:
1. تأكد من تشغيل السيرفر باستخدام `npm run dev:network`
2. تحقق من أن المنفذ 3000 غير مستخدم:
   ```bash
   netstat -ano | findstr :3000  # Windows
   lsof -i :3000                  # Mac/Linux
   ```

### المشكلة: OAuth لا يعمل

**الحل**: Google OAuth قد لا يعمل مع IP محلي. استخدم `localhost` فقط أو استخدم tunneling مثل ngrok:

```bash
npx ngrok http 3000
```

ثم استخدم الرابط الذي يعطيه ngrok في إعدادات OAuth.



