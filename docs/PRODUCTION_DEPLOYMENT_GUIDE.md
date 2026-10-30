# دليل النشر السحابي والتشغيل الحي لمنصة QHSSE Consultant
**Production Cloud Launch & Infrastructure Guide**

---

## 📌 نظرة عامة على البنية التحتية للمنصة
- **واجهة وخادم التطبيق:** Next.js 16 (React 19, App Router) بتقنية Server-Side Rendering (SSR).
- **قاعدة البيانات:** PostgreSQL السحابية الموزعة على منصة **Supabase** (EU West Region) مع تقنية **PgBouncer** لإدارة اتصالات Serverless Pooler على المنفذ `6543`.
- **التخزين السحابي:** Supabase Storage للمستندات، صور المعاينة، ورخص السلامة.
- **البريد المؤسسي وإشعارات الدخول:** **Microsoft Graph API (OAuth 2.0 Client Credentials)** مع صلاحية `Mail.Send` المعتمدة من مستأجر Microsoft Entra ID.
- **التوثيق والأمان:** NextAuth.js مع خوارزمية تشفير `bcrypt` (12 جولة) والتحقق بخطوتين (2FA OTP) وتتبع التواجد الجغرافي الحي.

---

## 🚀 الخيار الأول: النشر السريع عبر Vercel (موصى به لسرعته وتكامله)

المشروع تم ربطه بالفعل عبر Vercel بالمشروع:
- **Project Name:** `qhse.consultant.globel`
- **Project ID:** `prj_oXoC7LFuQLB1HhKmzd0QMk5fC83Z`

### 1. خطوات تفعيل النشر التلقائي عبر GitHub:
1. الدخول إلى لوحة تحكم [Vercel Dashboard](https://vercel.com).
2. فتح المشروع `qhse.consultant.globel` أو ربط المستودع: `https://github.com/YasserDiab3/QHSE-Consultancy-Global`.
3. الذهاب إلى تبويب **Settings** > **Environment Variables** والتأكد من إضافة المتغيرات التالية بدقة:

| اسم المتغير (Key) | الوصف والقيمة المطلوبة |
| :--- | :--- |
| `DATABASE_URL` | رابط اتصال Supabase Pooler (المنفذ 6543 مع `?sslmode=require&pgbouncer=true`) |
| `DIRECT_URL` | رابط اتصال Supabase المباشر (المنفذ 5432) لتنفيذ ترحيل المخططات |
| `NEXTAUTH_SECRET` | مفتاح التشفير الآمن لجلسات المستخدمين |
| `NEXTAUTH_URL` | رابط النطاق الحي: `https://qhsseconsultant.com` (أو رابط vercel الافتراضي) |
| `NEXT_PUBLIC_APP_URL` | رابط النطاق الحي: `https://qhsseconsultant.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | رابط مشروع Supabase: `https://whyssmlxtfvobclgleno.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مفتاح Anon العام للاتصال بتخزين Supabase |
| `AZURE_TENANT_ID` | `0d3b1b3a-df15-4931-92d1-5a54ad610f2f` |
| `AZURE_CLIENT_ID` | `33545093-c8d5-491d-a591-91509fe88ec4` |
| `AZURE_CLIENT_SECRET` | سر تطبيق QHSSE Mailer في Entra |
| `AZURE_SENDER_EMAIL` | بريد الإرسال: `support@qhsseconsultant.onmicrosoft.com` |

### 2. ربط النطاق المخصص (Custom Domain: `qhsseconsultant.com`):
1. في لوحة Vercel، اذهب إلى **Settings** > **Domains**.
2. أضف `qhsseconsultant.com` و `www.qhsseconsultant.com`.
3. سيعطيك Vercel السجلات المطلوبة لإضافتها في لوحة تحكم الدومين (GoDaddy / Namecheap / Cloudflare / المستضيف):
   - **نوع A Record:**
     - الاسم (Name): `@`
     - القيمة (Value / IP): `76.76.21.21`
   - **نوع CNAME:**
     - الاسم (Name): `www`
     - القيمة (Value): `cname.vercel-dns.com`
4. يقوم Vercel تلقائياً بتوليد شهادة أمان مشفرة **Let's Encrypt SSL/TLS (HTTPS)** فور تطابق السجلات.

---

## 🐳 الخيار الثاني: النشر عبر خادم سحابي مستقل (VPS / Docker / Cloud Server)

تم تجهيز ملفات النشر الحاوية الكاملة:
- [`Dockerfile`](file:///d:/Apps/safety%20consulataint/Dockerfile) (Multi-stage build خفيف وسريع)
- [`docker-compose.yml`](file:///d:/Apps/safety%20consulataint/docker-compose.yml)
- [`.dockerignore`](file:///d:/Apps/safety%20consulataint/.dockerignore)

### خطوات التشغيل على أي سيرفر Linux (Ubuntu 22.04 / 24.04):
```bash
# 1. سحب الكود من GitHub
git clone https://github.com/YasserDiab3/QHSE-Consultancy-Global.git
cd QHSE-Consultancy-Global

# 2. التأكد من وجود ملف متغيرات البيئة للإنتاج (.env.production)
# تم رفع النموذج وقيم الاتصال المؤمنة

# 3. بناء وتشغيل الحاوية السحابية
docker compose up -d --build

# 4. فحص صحة التطبيق
curl http://localhost:3000/api/health
```

### إعداد Nginx العكسي مع شهادة SSL مجانية:
```nginx
server {
    server_name qhsseconsultant.com www.qhsseconsultant.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
ثم تشغيل أداة Certbot لإصدار الشهادة:
```bash
sudo certbot --nginx -d qhsseconsultant.com -d www.qhsseconsultant.com
```

---

## ✅ قائمة التحقق قبل التدشين المباشر (Pre-Flight Checklist)

- [x] **فحص نقطة الصحة (`/api/health`):** تعود بـ `status: healthy` لجميع الخدمات.
- [x] **حماية الهوية والشعار:** الشعار والأصول البصرية في `public/brand/` محفوظة بدقة.
- [x] **قاعدة البيانات السحابية:** جميع الجداول الـ 18 نشطة على Supabase مع الـ Foreign Keys.
- [x] **البريد السحابي:** تطبيق Microsoft Entra حاصل على موافقة المسؤول (Admin Consent) لصلاحية `Mail.Send`.
- [x] **الاختبارات الآلية:** اجتياز 61 من 61 اختباراً آلياً بنسبة 100%.
- [x] **بناء الإنتاج (Production Build):** تم التأكد من نجاح أمر `next build` بدون أي أخطاء برمجية أو تحذيرات تمنع التشغيل.
