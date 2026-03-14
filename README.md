# 🏫 نظام متابعة السلوك والانضباط المدرسي
## تحويل كامل: Google Apps Script → Netlify + Supabase

---

## 📁 هيكل المشروع

```
netlify-system/
├── netlify/
│   └── functions/
│       └── api.js              ← الـ Backend (يستبدل gs.txt)
├── public/
│   ├── index.html              ← لوحة الإدارة
│   ├── teacher.html            ← بوابة المعلم
│   ├── parent.html             ← بوابة ولي الأمر
│   └── api-client.js           ← بديل google.script.run
├── supabase_schema.sql         ← جداول قاعدة البيانات
├── netlify.toml                ← إعدادات Netlify
├── package.json
└── .env.example
```

---

## 🚀 خطوات الإعداد (مرة واحدة فقط)

### الخطوة 1: إعداد Supabase

1. اذهب إلى [supabase.com](https://supabase.com) وافتح مشروعك الحالي أو أنشئ مشروعاً جديداً
2. افتح **SQL Editor**
3. انسخ محتوى ملف `supabase_schema.sql` والصقه وشغّله
4. من **Settings → API**، انسخ:
   - **Project URL** → هذا هو `SUPABASE_URL`
   - **service_role** key (مش anon) → هذا هو `SUPABASE_SERVICE_KEY`

> ⚠️ استخدم `service_role` وليس `anon` لأن الـ Backend يحتاج صلاحيات كاملة

---

### الخطوة 2: رفع المشروع على GitHub

```bash
cd netlify-system
git init
git add .
git commit -m "نظام متابعة السلوك - Netlify"
git remote add origin https://github.com/YOUR_USERNAME/school-discipline.git
git push -u origin main
```

---

### الخطوة 3: ربط Netlify

1. اذهب إلى [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. اختر المستودع
3. إعدادات البناء:
   - **Build command**: *(اتركه فارغاً)*
   - **Publish directory**: `public`
4. اضغط **Deploy site**

---

### الخطوة 4: إضافة متغيرات البيئة في Netlify

من **Site settings → Environment variables**، أضف:

| المتغير | القيمة |
|---------|--------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJhbG...` (service_role key) |

ثم اضغط **Trigger deploy** لإعادة البناء.

---

### الخطوة 5: إعداد المدارس

في Supabase SQL Editor، أضف مدرستك:

```sql
INSERT INTO schools (school_code, name, admin_password, sys_password, end_date)
VALUES ('SCH001', 'اسم المدرسة', 'كلمة_مرور_الإدارة', 'كلمة_مرور_النظام', '2026-12-31');
```

---

## 🔗 روابط النظام

بعد النشر، روابطك ستكون:

| الصفحة | الرابط |
|--------|--------|
| لوحة الإدارة | `https://your-site.netlify.app/` |
| بوابة المعلم | `https://your-site.netlify.app/teacher.html` |
| بوابة ولي الأمر | `https://your-site.netlify.app/parent.html` |

### دعم مدارس متعددة (Multi-tenant)

كل مدرسة تدخل بإضافة `?school=SCHOOL_CODE` لأي رابط:

```
https://your-site.netlify.app/?school=SCH001          ← إدارة مدرسة 1
https://your-site.netlify.app/?school=SCH002          ← إدارة مدرسة 2
https://your-site.netlify.app/teacher.html?school=SCH001
https://your-site.netlify.app/parent.html?school=SCH001
```

---

## ⚡ مقارنة: GAS vs Netlify

| الجانب | Google Apps Script | Netlify + Supabase |
|--------|-------------------|-------------------|
| السرعة | بطيء (cold start ~5s) | سريع جداً (<500ms) |
| قاعدة البيانات | Google Sheets | PostgreSQL كاملة |
| حد الطلبات | محدود جداً | مريح |
| CORS | مقيّد | مفتوح |
| SSL | تلقائي | تلقائي |
| التكلفة | مجاني | مجاني (Netlify Free) |
| السجل التاريخي | صعب | SQL استعلامات |

---

## 🏗️ كيف تعمل البنية

```
المتصفح (HTML)
    ↓ google.script.run (محاكى بـ Proxy)
api-client.js
    ↓ POST /api { action: "...", schoolCode: "SCH001", ...params }
Netlify Function (api.js)
    ↓ fetch to Supabase REST API
Supabase PostgreSQL
    ↓ JSON response
Netlify Function
    ↓ JSON
api-client.js
    ↓ withSuccessHandler(result)
المتصفح (HTML)
```

---

## 🔧 تخصيص لكل مدرسة

### طريقة 1: رابط مخصص لكل مدرسة
```
https://your-site.netlify.app/?school=SCH001
```
احفظ هذا الرابط وشاركه مع المدرسة فقط.

### طريقة 2: نشر منفصل لكل مدرسة
إذا أردت نطاقاً منفصلاً لكل مدرسة، يمكنك إنشاء `netlify.toml` خاص:
```toml
[build.environment]
  SCHOOL_CODE = "SCH001"
```

---

## 🛡️ الأمان

- الـ `service_role` key يبقى في الـ Backend فقط (Netlify Function)، لا يُرسَل للمتصفح
- كل طلب يحمل `schoolCode` ويتحقق من الترخيص في Supabase
- لا يوجد `anon` key في الـ Frontend — كل الطلبات تمر بالـ Backend

---

## 📞 استكشاف الأخطاء

**المشكلة**: "خطأ في السيرفر" عند تسجيل الدخول
**الحل**: تأكد من إضافة `SUPABASE_URL` و`SUPABASE_SERVICE_KEY` في Netlify Environment Variables

**المشكلة**: صفحة بيضاء
**الحل**: افتح Console في المتصفح — إذا ظهر `[API Client] Initialized` فالـ client يعمل

**المشكلة**: "المدرسة غير مسجلة"
**الحل**: أضف المدرسة في جدول `schools` في Supabase

---

*تم التحويل بالكامل من Google Apps Script إلى Netlify + Supabase*
