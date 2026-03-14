-- ═══════════════════════════════════════════════════════════
--  نظام متابعة السلوك والانضباط المدرسي — Supabase Schema
--  تحويل كامل من Google Sheets إلى PostgreSQL
-- ═══════════════════════════════════════════════════════════

-- تفعيل UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. جدول المدارس (الترخيص)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_code     TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  admin_password  TEXT NOT NULL,
  sys_password    TEXT NOT NULL,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  end_date        DATE NOT NULL,
  whatsapp        TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 2. الفصول
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_code TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_code, name)
);

-- ─────────────────────────────────────────
-- 3. الطلاب
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_code  TEXT NOT NULL,
  name         TEXT NOT NULL,
  phone        TEXT DEFAULT 'بدون رقم',
  class_name   TEXT NOT NULL,
  national_id  TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_code);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(school_code, class_name);

-- ─────────────────────────────────────────
-- 4. أنواع المخالفات السلوكية
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS violation_types (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_code TEXT NOT NULL,
  type_name   TEXT NOT NULL,
  message     TEXT NOT NULL,
  severity    TEXT DEFAULT 'بسيطة',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_code, type_name)
);

-- ─────────────────────────────────────────
-- 5. أنواع المخالفات الصفية
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_violation_types (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_code TEXT NOT NULL,
  type_name   TEXT NOT NULL,
  message     TEXT NOT NULL,
  severity    TEXT DEFAULT 'بسيطة',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_code, type_name)
);

-- ─────────────────────────────────────────
-- 6. أنواع السلوكيات الإيجابية
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS positive_behavior_types (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_code TEXT NOT NULL,
  type_name   TEXT NOT NULL,
  message     TEXT NOT NULL,
  score       TEXT DEFAULT '5',
  sub_type    TEXT DEFAULT 'إيجابي',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_code, type_name)
);

-- ─────────────────────────────────────────
-- 7. سجل المخالفات الرئيسي
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS violations_log (
  id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_code        TEXT NOT NULL,
  recorded_at        TIMESTAMPTZ DEFAULT NOW(),
  student_name       TEXT NOT NULL,
  class_name         TEXT NOT NULL,
  violation_type     TEXT NOT NULL,
  notes              TEXT DEFAULT '',
  recorder           TEXT DEFAULT 'الإدارة',
  severity           TEXT DEFAULT 'بسيطة',
  follow_up          TEXT DEFAULT '',
  student_signature  TEXT DEFAULT '',
  fingerprint        TEXT DEFAULT '',
  category           TEXT DEFAULT 'سلوكية',
  score              TEXT DEFAULT '0',
  subject            TEXT DEFAULT '',
  treatment_date     TIMESTAMPTZ,
  action_type        TEXT DEFAULT '',
  action_taken       TEXT DEFAULT '',
  visible_to_parent  TEXT DEFAULT 'لا',
  referred_to_admin  TEXT DEFAULT 'لا',
  referral_date      TIMESTAMPTZ,
  behavior_status    TEXT DEFAULT '',
  sub_type           TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_violations_school ON violations_log(school_code);
CREATE INDEX IF NOT EXISTS idx_violations_student ON violations_log(school_code, student_name, class_name);
CREATE INDEX IF NOT EXISTS idx_violations_date ON violations_log(school_code, recorded_at);

-- ─────────────────────────────────────────
-- 8. سجل السلوكيات الإيجابية
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS positive_behaviors_log (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_code    TEXT NOT NULL,
  recorded_at    TIMESTAMPTZ DEFAULT NOW(),
  student_name   TEXT NOT NULL,
  class_name     TEXT NOT NULL,
  behavior_type  TEXT NOT NULL,
  notes          TEXT DEFAULT '',
  recorder       TEXT DEFAULT 'الإدارة',
  sub_type       TEXT DEFAULT 'إيجابي'
);
CREATE INDEX IF NOT EXISTS idx_positive_school ON positive_behaviors_log(school_code);

-- ─────────────────────────────────────────
-- 9. سجل الرسائل
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages_log (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_code     TEXT NOT NULL,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  student_name    TEXT NOT NULL,
  class_name      TEXT NOT NULL,
  violation_type  TEXT NOT NULL,
  phone           TEXT DEFAULT '',
  message_text    TEXT DEFAULT '',
  status          TEXT DEFAULT 'مرسلة',
  sender          TEXT DEFAULT 'الإدارة',
  sub_type        TEXT DEFAULT '',
  category        TEXT DEFAULT 'سلوكية'
);

-- ─────────────────────────────────────────
-- 10. المعلمين
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_code TEXT NOT NULL,
  name        TEXT NOT NULL,
  subjects    TEXT DEFAULT '',
  classes     TEXT DEFAULT '',
  code        TEXT NOT NULL,
  active      TEXT DEFAULT 'نعم',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_code, code)
);

-- ─────────────────────────────────────────
-- 11. المحاضر (Reports)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id                 UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_code        TEXT NOT NULL,
  report_num         TEXT NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  student_name       TEXT NOT NULL,
  class_name         TEXT NOT NULL,
  violation_type     TEXT NOT NULL,
  region_name        TEXT DEFAULT '',
  school_name        TEXT DEFAULT '',
  reporter_role      TEXT DEFAULT '',
  reporter_name      TEXT DEFAULT '',
  student_signature  TEXT DEFAULT '',
  reporter_signature TEXT DEFAULT '',
  status             TEXT DEFAULT 'بانتظار الاستلام',
  received_at        TIMESTAMPTZ,
  read_at            TIMESTAMPTZ,
  violation_date     TIMESTAMPTZ DEFAULT NOW(),
  notes              TEXT DEFAULT '',
  UNIQUE (school_code, report_num)
);

-- ─────────────────────────────────────────
-- 12. الإعدادات المخصصة
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_settings (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_code TEXT UNIQUE NOT NULL,
  settings    JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 13. عداد المحاضر
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_counters (
  school_code   TEXT PRIMARY KEY,
  counter       INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────
-- Row Level Security (اختياري — للأمان)
-- ─────────────────────────────────────────
-- ملاحظة: الـ API يستخدم service_role key من الـ backend
-- لذا لا داعي لـ RLS مع Netlify Functions

-- ─────────────────────────────────────────
-- بيانات تجريبية - مدرسة افتراضية
-- ─────────────────────────────────────────
INSERT INTO schools (school_code, name, admin_password, sys_password, end_date)
VALUES ('SCH001', 'مدرسة تجريبية', 'admin123', 'teacher123', '2026-12-31')
ON CONFLICT (school_code) DO NOTHING;
