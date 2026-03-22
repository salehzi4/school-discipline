// ═══════════════════════════════════════════════════════════
//  Netlify Function — API Handler (يستبدل Google Apps Script)
//  المسار: /api/[action]
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY; // service_role key للأمان

// ─── مساعد الـ fetch لـ Supabase ───
async function sb(table, method = 'GET', params = '', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`;
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (method === 'DELETE' || (method === 'PATCH' && !params.includes('select'))) return { ok: res.ok };
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

// ─── تنسيق التاريخ ───
function fmtDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  const h = String(d.getHours()).padStart(2,'0');
  const min = String(d.getMinutes()).padStart(2,'0');
  return `${y}/${m}/${day} ${h}:${min}`;
}

// ═══════════════════════════════════════════════════════════
//  CORS + Handler
// ═══════════════════════════════════════════════════════════
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-School-Code',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action || event.queryStringParameters?.action;
    const schoolCode = body.schoolCode || event.headers['x-school-code'] || '';

    if (!action) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'action مطلوب' }) };
    }

    const result = await dispatch(action, body, schoolCode);
    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (e) {
    console.error('API Error:', e);
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: e.message || 'خطأ في السيرفر' })
    };
  }
};

// ═══════════════════════════════════════════════════════════
//  الموزع الرئيسي
// ═══════════════════════════════════════════════════════════
async function dispatch(action, body, schoolCode) {
  switch (action) {

    // ── الدخول ──
    case 'doLogin':         return doLogin(body.password, schoolCode);
    case 'doTeacherLogin':  return doTeacherLogin(body.code, schoolCode);
    case 'doUnifiedLogin':  return doUnifiedLogin(body.credential, schoolCode);

    // ── الفصول ──
    case 'getClasses':      return getClasses(schoolCode);
    case 'addClass':        return addClass(body.name, schoolCode);
    case 'deleteClass':     return deleteClass(body.name, schoolCode);
    case 'syncClassesNow':  return syncClassesNow(schoolCode);

    // ── الطلاب ──
    case 'getStudentsByClass':   return getStudentsByClass(body.className, schoolCode);
    case 'addStudentsBatch':     return addStudentsBatch(body.className, body.names, body.phones, body.ids, schoolCode);
    case 'updateStudent':        return updateStudent(body.className, body.oldName, body.newName, body.newPhone, body.newId, schoolCode);
    case 'deleteStudent':        return deleteStudent(body.className, body.studentName, schoolCode);
    case 'deleteStudentsByClass':return deleteStudentsByClass(body.className, schoolCode);
    case 'importStudentsBatch':  return importStudentsBatch(body.payload, body.mode, schoolCode);
    case 'verifyParentById':     return verifyParentById(body.nationalId, schoolCode);

    // ── أنواع المخالفات ──
    case 'getFixedViolations':         return getFixedViolations(body.stage);
    case 'getSchoolStage':             return getSchoolStage(schoolCode);
    case 'getRepeatCount':             return getRepeatCount(body.studentName, body.violationName, schoolCode);
    case 'recordFixedViolation':       return recordFixedViolation(body, schoolCode);
    case 'getViolationTypes':          return getViolationTypes(schoolCode);
    case 'addViolationTypesBatch':     return addViolationTypesBatch(body.types, body.messages, body.severities, schoolCode);
    case 'updateViolationType':        return updateViolationType(body.oldType, body.newType, body.newMessage, body.newSeverity, schoolCode);
    case 'deleteViolationType':        return deleteViolationType(body.typeName, schoolCode);

    // ── المخالفات الصفية ──
    case 'getClassViolationTypes':     return getClassViolationTypes(schoolCode);
    case 'addClassViolationTypesBatch':return addClassViolationTypesBatch(body.types, body.messages, body.severities, schoolCode);
    case 'updateClassViolationType':   return updateClassViolationType(body.oldType, body.newType, body.newMessage, body.newSeverity, schoolCode);
    case 'deleteClassViolationType':   return deleteClassViolationType(body.typeName, schoolCode);

    // ── السلوكيات الإيجابية ──
    case 'getPositiveBehaviorTypes':      return getPositiveBehaviorTypes(schoolCode);
    case 'addPositiveBehaviorTypesBatch': return addPositiveBehaviorTypesBatch(body.types, body.messages, body.scores, body.subTypes, schoolCode);
    case 'updatePositiveBehaviorType':    return updatePositiveBehaviorType(body.oldType, body.newType, body.newMessage, body.newScore, body.newSubType, schoolCode);
    case 'deletePositiveBehaviorType':    return deletePositiveBehaviorType(body.typeName, schoolCode);

    // ── السجلات ──
    case 'recordViolation':       return recordViolation(body, schoolCode);
    case 'recordPositiveBehavior':return recordPositiveBehavior(body, schoolCode);
    case 'logMessagesBatch':      return logMessagesBatch(body.messages, body.sender, schoolCode);

    // ── قراءة السجلات ──
    case 'getViolationsLog':      return getViolationsLog(body.filterClass, body.filterDate, body.filterType, schoolCode);
    case 'getMessagesLog':        return getMessagesLog(body.filterClass, body.filterDate, schoolCode);
    case 'getPositiveBehaviorsLog':return getPositiveBehaviorsLog(body.filterClass, body.filterDate, schoolCode);

    // ── تعديل السجلات ──
    case 'updateViolationLog':    return updateViolationLog(body.date, body.studentName, body.oldType, body.newType, body.newNotes, schoolCode);
    case 'deleteViolationLog':    return deleteViolationLog(body.date, body.studentName, body.violationType, schoolCode);
    case 'addFollowUp':           return addFollowUp(body.date, body.studentName, body.violationType, body.followUpText, body.behaviorStatus, schoolCode);
    case 'setVisibleToParent':    return setVisibleToParent(body.date, body.studentName, body.violationType, body.visible, schoolCode);
    case 'referViolationToAdmin': return referViolationToAdmin(body.studentName, body.violationType, body.className, schoolCode);
    case 'updateActionTaken':     return updateActionTaken(body.date, body.studentName, body.violationType, body.actionType, body.actionTaken, schoolCode);
    case 'adminApproveVisibility':return setVisibleToParent(body.date, body.studentName, body.violationType, body.visible, schoolCode);

    // ── المعلمين ──
    case 'getTeachers':      return getTeachers(schoolCode);
    case 'addTeacher':       return addTeacher(body.name, body.subjects, body.classes, body.code, schoolCode);
    case 'updateTeacher':    return updateTeacher(body.oldName, body.name, body.subjects, body.classes, body.code, body.active, schoolCode);
    case 'deleteTeacher':    return deleteTeacher(body.name, schoolCode);
    case 'deleteAllTeachers':return deleteAllTeachers(schoolCode);
    case 'upsertTeacher':    return upsertTeacher(body.name, body.subjects, body.classes, body.code, schoolCode);

    // ── الإحصاءات ──
    case 'getAdvancedStats':           return getAdvancedStats(body.dateFilter, schoolCode);
    case 'getWeeklyReport':            return getWeeklyReport(schoolCode);
    case 'getMonthlyChartData':        return getMonthlyChartData(schoolCode);
    case 'getHeatmapData':             return getHeatmapData(schoolCode);
    case 'getRepeatedViolations':      return getRepeatedViolations(body.filterClasses, schoolCode);
    case 'getRepeatedViolationsForAdmin':return getRepeatedViolationsForAdmin(schoolCode);
    case 'getReferredViolations':      return getReferredViolations(schoolCode);
    case 'getMyViolations':            return getMyViolations(body.dateFilter, body.teacherName, schoolCode);

    // ── ملف الطالب ──
    case 'getStudentProfile': return getStudentProfile(body.studentName, body.className, body.viewerRole, schoolCode);

    // ── المحاضر ──
    case 'saveReport':        return saveReport(body.data, schoolCode);
    case 'getReports':        return getReports(schoolCode);
    case 'getReportByNum':    return getReportByNum(body.reportNum, schoolCode);
    case 'updateReportStatus':return updateReportStatus(body.reportNum, body.status, schoolCode);
    case 'getReportsByStudent':return getReportsByStudent(body.studentName, body.className, schoolCode);
    case 'getFullReportData': return getFullReportData(body.dateFrom, body.dateTo, schoolCode);
    case 'getLastRegionName': return getLastRegionName(schoolCode);

    // ── الإعدادات ──
    case 'getCustomSettings':        return getCustomSettings(schoolCode);
    case 'getTeacherSettings':       return getPageSettings(schoolCode, 'teacher');
    case 'getParentSettings':        return getPageSettings(schoolCode, 'parent');
    case 'saveCustomSettings':return saveCustomSettings(body.settings, schoolCode);
    case 'getSchoolCode':     return { code: schoolCode };

    // ── روابط (محاكاة) ──
    case 'getTeacherUrl':     return { url: `${process.env.SITE_URL || ''}/teacher.html?school=${schoolCode}` };
    case 'getParentUrl':      return { url: `${process.env.SITE_URL || ''}/parent.html?school=${schoolCode}` };
    case 'getSpreadsheetUrl': return { url: '#' };
    case 'initializeSheets':  return { message: 'النظام جاهز ✅ (Supabase)', success: true };

    default:
      return { error: `action غير معروف: ${action}` };
  }
}

// ═══════════════════════════════════════════════════════════
//  الترخيص
// ═══════════════════════════════════════════════════════════
async function checkLicense(password, schoolCode) {
  const rows = await sb('schools', 'GET', `school_code=eq.${schoolCode}&select=*`);
  if (!Array.isArray(rows) || !rows.length) return { ok: false, msg: 'المدرسة غير مسجلة' };
  const s = rows[0];
  if (s.status === 'suspended') return { ok: false, msg: 'تم إيقاف الاشتراك' };
  const isAdmin   = password === s.admin_password;
  const isTeacher = password === s.sys_password;
  if (!isAdmin && !isTeacher) return { ok: false, msg: 'رمز الدخول غير صحيح' };
  const today    = new Date();
  const expiry   = new Date(s.end_date);
  const daysLeft = Math.ceil((expiry - today) / 86400000);
  if (daysLeft < 0) {
    return { ok: true, readOnly: true, role: isAdmin ? 'admin' : 'teacher',
      msg: `انتهى الاشتراك بتاريخ ${s.end_date}`, whatsapp: s.whatsapp || '' };
  }
  return { ok: true, readOnly: false, role: isAdmin ? 'admin' : 'teacher',
    daysLeft, warning: daysLeft <= 5, schoolName: s.name, endDate: s.end_date };
}

async function checkLicenseStatus(schoolCode) {
  const rows = await sb('schools', 'GET', `school_code=eq.${schoolCode}&select=status,end_date,whatsapp`);
  if (!Array.isArray(rows) || !rows.length) return { readOnly: false, daysLeft: 999 };
  const s = rows[0];
  if (s.status === 'suspended') return { readOnly: true, msg: 'تم إيقاف الاشتراك' };
  const daysLeft = Math.ceil((new Date(s.end_date) - new Date()) / 86400000);
  if (daysLeft < 0) return { readOnly: true, msg: `انتهى الاشتراك بتاريخ ${s.end_date}`, whatsapp: s.whatsapp };
  return { readOnly: false, daysLeft, warning: daysLeft <= 5 };
}

async function doLogin(password, schoolCode) {
  const license = await checkLicense(password, schoolCode);
  if (!license.ok) return { success: false, error: license.msg };
  return { success: true, role: license.role, readOnly: license.readOnly || false,
    daysLeft: license.daysLeft || 0, warning: license.warning || false,
    schoolName: license.schoolName || '', expiredMsg: license.msg || '',
    whatsapp: license.whatsapp || '', endDate: license.endDate || '' };
}

// ═══════════════════════════════════════════════════════════
//  الدخول الموحد — رابط واحد لكل المدارس والأدوار
// ═══════════════════════════════════════════════════════════
async function doUnifiedLogin(credential, schoolCode) {
  if (!credential || !credential.trim()) {
    return { success: false, error: 'أدخل كلمة المرور أو رقم الهوية' };
  }
  const cred = credential.trim();
  const sc = (schoolCode || '').trim();

  // 1. هل هي رمز معلم؟
  let teacherQuery = `code=eq.${encodeURIComponent(cred)}&select=*`;
  if (sc) teacherQuery += `&school_code=eq.${sc}`;
  const teacherRows = await sb('teachers', 'GET', teacherQuery);
  const activeTeachers = Array.isArray(teacherRows) ? teacherRows.filter(t => t.active === 'نعم') : [];
  if (activeTeachers.length > 1) {
    return { success: false, error: 'رمز الدخول مكرر في أكثر من مدرسة — تواصل مع مسؤول النظام' };
  }
  if (activeTeachers.length) {
    const t = activeTeachers[0];
    const schoolRows = await sb('schools', 'GET',
      `school_code=eq.${t.school_code}&select=status,end_date,name`);
    if (Array.isArray(schoolRows) && schoolRows.length) {
      const s = schoolRows[0];
      if (s.status === 'suspended') return { success: false, error: 'تم إيقاف اشتراك المدرسة' };
      const daysLeft = Math.ceil((new Date(s.end_date) - new Date()) / 86400000);
      const readOnly = daysLeft < 0;
      return { success: true, role: 'teacher', schoolCode: t.school_code,
        schoolName: s.name, readOnly,
        teacher: { name: t.name, subjects: t.subjects, classes: t.classes.split(',').map(c => c.trim()) },
        daysLeft: readOnly ? 0 : daysLeft, warning: daysLeft <= 5 && daysLeft >= 0 };
    }
  }

  // 2. هل هي كلمة مرور إدارة؟ (مع فلتر المدرسة إذا محدد)
  let adminQuery = `admin_password=eq.${encodeURIComponent(cred)}&status=eq.active&select=*`;
  if (sc) adminQuery += `&school_code=eq.${sc}`;
  const adminRows = await sb('schools', 'GET', adminQuery);
  if (Array.isArray(adminRows) && adminRows.length) {
    const s = adminRows[0];
    const today = new Date();
    const daysLeft = Math.ceil((new Date(s.end_date) - today) / 86400000);
    if (daysLeft < 0) {
      return { success: true, role: 'admin', readOnly: true, schoolCode: s.school_code,
        schoolName: s.name, expiredMsg: `انتهى الاشتراك بتاريخ ${s.end_date}` };
    }
    return { success: true, role: 'admin', readOnly: false, schoolCode: s.school_code,
      schoolName: s.name, daysLeft, warning: daysLeft <= 5 };
  }

  // 3. هل هي رقم هوية طالب؟
  let studentQuery = `national_id=eq.${encodeURIComponent(cred)}&select=name,class_name,school_code`;
  if (sc) studentQuery += `&school_code=eq.${sc}`;
  const studentRows = await sb('students', 'GET', studentQuery);
  if (Array.isArray(studentRows) && studentRows.length) {
    const st = studentRows[0];
    const schoolRows = await sb('schools', 'GET',
      `school_code=eq.${st.school_code}&select=status,end_date,name`);
    if (Array.isArray(schoolRows) && schoolRows.length) {
      const s = schoolRows[0];
      if (s.status === 'suspended') return { success: false, error: 'تم إيقاف اشتراك المدرسة' };
      const daysLeft = Math.ceil((new Date(s.end_date) - new Date()) / 86400000);
      if (daysLeft < 0) return { success: false, error: 'انتهى اشتراك المدرسة' };
      return { success: true, role: 'parent', schoolCode: st.school_code,
        schoolName: s.name, student: { name: st.name, className: st.class_name } };
    }
  }

  return { success: false, error: 'كلمة المرور أو رقم الهوية غير صحيح' };
}

async function doTeacherLogin(code, schoolCode) {
  const teacher = await verifyTeacher(code, schoolCode);
  if (!teacher) return { success: false, error: 'رمز الدخول غير صحيح أو المعلم غير فعّال' };
  const licenseCheck = await checkLicenseStatus(schoolCode);
  return { success: true, teacher, readOnly: licenseCheck.readOnly || false,
    daysLeft: licenseCheck.daysLeft || 999, warning: licenseCheck.warning || false,
    expiredMsg: licenseCheck.msg || '' };
}

// ═══════════════════════════════════════════════════════════
//  الفصول
// ═══════════════════════════════════════════════════════════
async function getClasses(sc) {
  const rows = await sb('classes', 'GET', `school_code=eq.${sc}&select=name&order=name`);
  return Array.isArray(rows) ? rows.map(r => r.name) : [];
}

async function addClass(name, sc) {
  const existing = await sb('classes', 'GET', `school_code=eq.${sc}&name=eq.${encodeURIComponent(name)}`);
  if (Array.isArray(existing) && existing.length) return { success: false, message: 'هذا الفصل موجود مسبقاً' };
  await sb('classes', 'POST', '', { school_code: sc, name: name.trim() });
  return { success: true, message: 'تمت إضافة الفصل ✅' };
}

async function deleteClass(name, sc) {
  await sb('classes', 'DELETE', `school_code=eq.${sc}&name=eq.${encodeURIComponent(name)}`);
  return { success: true };
}

async function syncClassesNow(sc) {
  // اجلب كل الفصول من الطلاب وأضفها للجدول
  const students = await sb('students', 'GET', `school_code=eq.${sc}&select=class_name`);
  if (!Array.isArray(students)) return { success: false };
  const unique = [...new Set(students.map(s => s.class_name).filter(Boolean))];
  const existing = await getClasses(sc);
  const toAdd = unique.filter(c => !existing.includes(c));
  for (const name of toAdd) {
    await sb('classes', 'POST', '', { school_code: sc, name }).catch(() => {});
  }
  return { success: true, message: 'تم مزامنة الفصول ✅' };
}

// ═══════════════════════════════════════════════════════════
//  الطلاب
// ═══════════════════════════════════════════════════════════
async function getStudentsByClass(className, sc) {
  const rows = await sb('students', 'GET',
    `school_code=eq.${sc}&class_name=eq.${encodeURIComponent(className)}&order=name`);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({ name: r.name, phone: r.phone, className: r.class_name, nationalId: r.national_id || '' }));
}

async function addStudentsBatch(className, namesText, phonesText, idsText, sc) {
  const names  = namesText.split('\n').map(n => n.trim()).filter(Boolean);
  const phones = phonesText.split('\n').map(p => p.trim());
  const ids    = idsText ? idsText.split('\n').map(i => i.trim()) : [];
  if (!names.length) return { success: false, message: 'لا توجد أسماء' };
  while (phones.length < names.length) phones.push('بدون رقم');
  while (ids.length < names.length) ids.push('');
  const rows = names.map((n, i) => ({ school_code: sc, name: n, phone: phones[i] || 'بدون رقم', class_name: className, national_id: ids[i] || '' }));
  await sb('students', 'POST', '', rows);
  // مزامنة الفصل تلقائياً
  await addClass(className, sc).catch(() => {});
  return { success: true, message: `تمت إضافة ${names.length} طالب ✅` };
}

async function updateStudent(className, oldName, newName, newPhone, newId, sc) {
  await sb('students', 'PATCH',
    `school_code=eq.${sc}&class_name=eq.${encodeURIComponent(className)}&name=eq.${encodeURIComponent(oldName)}`,
    { name: newName, phone: newPhone, national_id: newId || '' });
  return { success: true, message: 'تم التعديل ✅' };
}

async function deleteStudent(className, studentName, sc) {
  await sb('students', 'DELETE',
    `school_code=eq.${sc}&class_name=eq.${encodeURIComponent(className)}&name=eq.${encodeURIComponent(studentName)}`);
  return { success: true };
}

async function deleteStudentsByClass(className, sc) {
  await sb('students', 'DELETE',
    `school_code=eq.${sc}&class_name=eq.${encodeURIComponent(className)}`);
  return { success: true, message: 'تم الحذف ✅' };
}

async function importStudentsBatch(payload, mode, sc) {
  if (!Array.isArray(payload)) return { success: false, message: 'بيانات غير صحيحة' };
  let addedCount = 0, updatedCount = 0;

  if (mode === 'replace') {
    await sb('students', 'DELETE', `school_code=eq.${sc}`);
    const allRows = [];
    payload.forEach(cls => {
      const names  = cls.names.split('\n').map(n => n.trim()).filter(Boolean);
      const phones = cls.phones.split('\n').map(p => p.trim());
      const ids    = cls.ids.split('\n').map(i => i.trim());
      while (phones.length < names.length) phones.push('بدون رقم');
      while (ids.length < names.length) ids.push('');
      names.forEach((n, i) => {
        allRows.push({ school_code: sc, name: n, phone: phones[i] || 'بدون رقم', class_name: cls.className, national_id: ids[i] || '' });
        addedCount++;
      });
    });
    if (allRows.length) await sb('students', 'POST', '', allRows);
  } else {
    const existing = await sb('students', 'GET', `school_code=eq.${sc}&select=national_id,name,class_name`);
    const existingIds = {};
    if (Array.isArray(existing)) existing.forEach(r => { if (r.national_id) existingIds[r.national_id] = r; });
    const toAdd = [];
    for (const cls of payload) {
      const names  = cls.names.split('\n').map(n => n.trim()).filter(Boolean);
      const phones = cls.phones.split('\n').map(p => p.trim());
      const ids    = cls.ids.split('\n').map(i => i.trim());
      while (phones.length < names.length) phones.push('بدون رقم');
      while (ids.length < names.length) ids.push('');
      for (let i = 0; i < names.length; i++) {
        const id = ids[i] || '';
        if (id && existingIds[id]) {
          if (mode === 'update') {
            await sb('students', 'PATCH', `school_code=eq.${sc}&national_id=eq.${id}`,
              { name: names[i], phone: phones[i] || 'بدون رقم', class_name: cls.className });
            updatedCount++;
          }
        } else {
          toAdd.push({ school_code: sc, name: names[i], phone: phones[i] || 'بدون رقم', class_name: cls.className, national_id: id });
          addedCount++;
        }
      }
    }
    if (toAdd.length) await sb('students', 'POST', '', toAdd);
  }
  await syncClassesNow(sc);
  const msg = mode === 'replace'
    ? `تم استبدال الطلاب: ${addedCount} طالب ✅`
    : `تمت الإضافة: ${addedCount} جديد${updatedCount ? ' · ' + updatedCount + ' محدَّث' : ''} ✅`;
  return { success: true, message: msg };
}

async function verifyParentById(nationalId, sc) {
  const rows = await sb('students', 'GET',
    `school_code=eq.${sc}&national_id=eq.${encodeURIComponent(nationalId)}&select=name,class_name`);
  if (!Array.isArray(rows) || !rows.length) return null;
  return { name: rows[0].name, className: rows[0].class_name };
}

// ═══════════════════════════════════════════════════════════
//  أنواع المخالفات
// ═══════════════════════════════════════════════════════════
async function getViolationTypes(sc) {
  const rows = await sb('violation_types', 'GET', `school_code=eq.${sc}&order=type_name`);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({ type: r.type_name, message: r.message, severity: r.severity || 'بسيطة' }));
}

async function addViolationTypesBatch(typesText, messagesText, severitiesText, sc) {
  const types = typesText.split('\n').map(t => t.trim()).filter(Boolean);
  const msgs  = messagesText.split('\n').map(m => m.trim()).filter(Boolean);
  const sevs  = severitiesText ? severitiesText.split('\n').map(s => s.trim()) : [];
  if (!types.length) return { success: false, message: 'لا توجد مخالفات' };
  if (types.length !== msgs.length) return { success: false, message: 'عدد المخالفات لا يتطابق مع النصوص' };
  const rows = types.map((t, i) => ({ school_code: sc, type_name: t, message: msgs[i], severity: sevs[i] || 'بسيطة' }));
  await sb('violation_types', 'POST', '', rows);
  return { success: true, message: 'تمت الإضافة ✅' };
}

async function updateViolationType(oldType, newType, newMessage, newSeverity, sc) {
  await sb('violation_types', 'PATCH',
    `school_code=eq.${sc}&type_name=eq.${encodeURIComponent(oldType)}`,
    { type_name: newType, message: newMessage, severity: newSeverity || 'بسيطة' });
  return { success: true, message: 'تم التعديل ✅' };
}

async function deleteViolationType(typeName, sc) {
  await sb('violation_types', 'DELETE', `school_code=eq.${sc}&type_name=eq.${encodeURIComponent(typeName)}`);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  المخالفات الصفية
// ═══════════════════════════════════════════════════════════
async function getClassViolationTypes(sc) {
  const rows = await sb('class_violation_types', 'GET', `school_code=eq.${sc}&order=type_name`);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({ type: r.type_name, message: r.message, severity: r.severity || 'بسيطة' }));
}

async function addClassViolationTypesBatch(typesText, messagesText, severitiesText, sc) {
  const types = typesText.split('\n').map(t => t.trim()).filter(Boolean);
  const msgs  = messagesText.split('\n').map(m => m.trim()).filter(Boolean);
  const sevs  = severitiesText ? severitiesText.split('\n').map(s => s.trim()) : [];
  if (!types.length || types.length !== msgs.length) return { success: false, message: 'بيانات غير صحيحة' };
  const rows = types.map((t, i) => ({ school_code: sc, type_name: t, message: msgs[i], severity: sevs[i] || 'بسيطة' }));
  await sb('class_violation_types', 'POST', '', rows);
  return { success: true, message: 'تمت الإضافة ✅' };
}

async function updateClassViolationType(oldType, newType, newMessage, newSeverity, sc) {
  await sb('class_violation_types', 'PATCH',
    `school_code=eq.${sc}&type_name=eq.${encodeURIComponent(oldType)}`,
    { type_name: newType, message: newMessage, severity: newSeverity || 'بسيطة' });
  return { success: true, message: 'تم التعديل ✅' };
}

async function deleteClassViolationType(typeName, sc) {
  await sb('class_violation_types', 'DELETE', `school_code=eq.${sc}&type_name=eq.${encodeURIComponent(typeName)}`);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  السلوكيات الإيجابية
// ═══════════════════════════════════════════════════════════
async function getPositiveBehaviorTypes(sc) {
  const rows = await sb('positive_behavior_types', 'GET', `school_code=eq.${sc}&order=type_name`);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({ type: r.type_name, message: r.message, score: r.score || '5', subType: r.sub_type || 'إيجابي' }));
}

async function addPositiveBehaviorTypesBatch(typesText, messagesText, scoresText, subTypesText, sc) {
  const types    = typesText.split('\n').map(t => t.trim()).filter(Boolean);
  const msgs     = messagesText.split('\n').map(m => m.trim()).filter(Boolean);
  const scores   = scoresText ? scoresText.split('\n').map(s => s.trim()) : [];
  const subTypes = subTypesText ? subTypesText.split('\n').map(s => s.trim()) : [];
  if (!types.length || types.length !== msgs.length) return { success: false, message: 'بيانات غير صحيحة' };
  const rows = types.map((t, i) => ({ school_code: sc, type_name: t, message: msgs[i], score: scores[i] || '5', sub_type: subTypes[i] || 'إيجابي' }));
  await sb('positive_behavior_types', 'POST', '', rows);
  return { success: true, message: 'تمت الإضافة ✅' };
}

async function updatePositiveBehaviorType(oldType, newType, newMessage, newScore, newSubType, sc) {
  await sb('positive_behavior_types', 'PATCH',
    `school_code=eq.${sc}&type_name=eq.${encodeURIComponent(oldType)}`,
    { type_name: newType, message: newMessage, score: newScore || '5', sub_type: newSubType || 'إيجابي' });
  return { success: true, message: 'تم التعديل ✅' };
}

async function deletePositiveBehaviorType(typeName, sc) {
  await sb('positive_behavior_types', 'DELETE', `school_code=eq.${sc}&type_name=eq.${encodeURIComponent(typeName)}`);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  تسجيل المخالفات
// ═══════════════════════════════════════════════════════════
async function recordViolation(body, sc) {
  const { studentsData, violationType, notes, recorder, severity, signature, fingerprint, category, score, subject, actionType, actionTaken, subType, visibleToParentOverride } = body;
  const isPositive  = (category === 'إيجابية');
  const isDangerous = (severity === 'خطيرة');
  const visibleToParent = isPositive ? 'نعم' : (isDangerous ? 'لا' : (visibleToParentOverride === 'نعم' ? 'نعم' : 'لا'));
  const referredToAdmin = isDangerous ? 'نعم' : 'لا';
  const now = new Date().toISOString();

  if (isPositive) {
    // سجل السلوك الإيجابي المستقل
    const posRows = studentsData.map(s => ({
      school_code: sc, student_name: s.name, class_name: s.className,
      behavior_type: violationType, notes: notes || '', recorder: recorder || 'الإدارة', sub_type: subType || 'إيجابي'
    }));
    await sb('positive_behaviors_log', 'POST', '', posRows);
    return { success: true, message: `تم تسجيل السلوك الإيجابي لـ ${studentsData.length} طالب ✅` };
  }

  const rows = studentsData.map(s => ({
    school_code: sc, student_name: s.name, class_name: s.className,
    violation_type: violationType, notes: notes || '', recorder: recorder || 'الإدارة',
    severity: severity || 'بسيطة', student_signature: signature || '', fingerprint: fingerprint || '',
    category: category || 'سلوكية', score: score || '0', subject: subject || '',
    action_type: actionType || '', action_taken: actionTaken || '',
    visible_to_parent: visibleToParent, referred_to_admin: referredToAdmin,
    referral_date: isDangerous ? now : null, sub_type: subType || ''
  }));
  await sb('violations_log', 'POST', '', rows);
  return { success: true, message: `تم تسجيل المخالفة لـ ${studentsData.length} طالب ✅` };
}

// ═══════════════════════════════════════════════════════════
//  المخالفات الثابتة — الجديد
// ═══════════════════════════════════════════════════════════

async function getFixedViolations(stage) {
  // جلب كل المخالفات المناسبة للمرحلة
  const stageFilter = stage === 'elementary'
    ? `stage=in.(elementary,both)`
    : stage === 'secondary'
    ? `stage=in.(secondary,both)`
    : `stage=in.(elementary,secondary,both)`;

  const violations = await sb('fixed_violations', 'GET', `${stageFilter}&order=degree.asc,sort_order.asc`);
  if (!Array.isArray(violations)) return [];

  // جلب التوابع
  const children = await sb('fixed_violations_children', 'GET', 'order=parent_id.asc,sort_order.asc');
  const childMap = {};
  if (Array.isArray(children)) {
    children.forEach(c => {
      if (!childMap[c.parent_id]) childMap[c.parent_id] = [];
      childMap[c.parent_id].push(c.name);
    });
  }

  return violations.map(v => ({
    id: v.id,
    name: v.name,
    degree: v.degree,
    stage: v.stage,
    category: v.category,
    has_children: v.has_children,
    sub_type: v.sub_type,
    sort_order: v.sort_order,
    children: childMap[v.id] || []
  }));
}

async function getSchoolStage(sc) {
  const rows = await sb('schools', 'GET', `school_code=eq.${sc}&select=stage`);
  if (Array.isArray(rows) && rows.length) return rows[0].stage || 'elementary';
  return 'elementary';
}

async function getRepeatCount(studentName, violationName, sc) {
  const rows = await sb('violations_log', 'GET',
    `school_code=eq.${sc}&student_name=eq.${encodeURIComponent(studentName)}&violation_type=eq.${encodeURIComponent(violationName)}&select=id`
  );
  return Array.isArray(rows) ? rows.length : 0;
}

async function recordFixedViolation(body, sc) {
  const { studentsData, violations, actionText, recorder, degree, category, subViolation, notes, subject, stage } = body;
  // violations = array of { name, subViolation, degree, category }
  const now = new Date().toISOString();
  const results = [];

  for (const student of studentsData) {
    for (const viol of violations) {
      const violName = viol.name;
      const deg = viol.degree || degree || '1';
      const cat = viol.category || category || 'behavioral';
      const sub = viol.subViolation || subViolation || '';
      // اسم المخالفة الكامل = الاسم الرئيسي + التابع إن وجد
      const fullViolName = sub ? (violName + ' — ' + sub) : violName;

      // احسب عدد التكرار بناءً على الاسم الكامل
      const existing = await sb('violations_log', 'GET',
        `school_code=eq.${sc}&student_name=eq.${encodeURIComponent(student.name)}&violation_type=eq.${encodeURIComponent(fullViolName)}&select=id`
      );
      const repeatCount = Array.isArray(existing) ? existing.length + 1 : 1;

      // تحديد الدرجة والإحالة
      const isStaff = cat === 'staff';
      const degNum = parseInt(deg) || 1;
      const maxRefDeg = (stage === 'elementary') ? 4 : 5;
      const autoRefer = isStaff || (degNum >= 2 && degNum <= maxRefDeg) || viol.referred_to_admin === 'نعم';
      // إحالة تلقائية عند تكرار المخالفة 3 مرات (درجة 1 فقط)
      const repeatAutoRefer = degNum === 1 && repeatCount >= 3;
      const finalAutoRefer = autoRefer || repeatAutoRefer;
      // ملاحظة الإحالة للإدارة (تظهر في صفحة الطلاب المحالون)
      const referralNote = repeatAutoRefer
        ? 'الطالب قام بتكرار المخالفة (' + fullViolName + ') ' + repeatCount + ' مرات'
        : (degNum >= 2 ? 'مخالفة درجة ' + degNum : '');
      const referredToAdmin = finalAutoRefer ? 'نعم' : 'لا';
      const referralDate = finalAutoRefer ? now : null;

      // تحديد الظهور لولي الأمر
      const visibleToParent = (cat === 'positive' || cat === 'absence') ? 'نعم' : 'لا';

      const row = {
        school_code: sc,
        student_name: student.name,
        class_name: student.className,
        violation_type: fullViolName,
        notes: notes || sub || '',
        recorder: recorder || 'الإدارة',
        severity: deg,
        degree: deg,
        category: cat === 'behavioral' ? 'سلوكية' : cat === 'staff' ? 'تجاه الهيئة' : cat === 'class' ? 'صفية' : cat === 'positive' ? 'إيجابية' : cat,
        action_taken: viol.actionText || actionText || '',
        visible_to_parent: visibleToParent,
        referred_to_admin: referredToAdmin,
        referral_date: referralDate,
        repeat_count: repeatCount,
        sub_violation: sub,
        subject: subject || ''
      };

      results.push(row);
    }
  }

  await sb('violations_log', 'POST', '', results);
  return { success: true, message: `تم تسجيل ${results.length} مخالفة ✅` };
}

async function recordPositiveBehavior(body, sc) {
  const { studentsData, behaviorType, notes, recorder, score, subType } = body;
  const posRows = studentsData.map(s => ({
    school_code: sc, student_name: s.name, class_name: s.className,
    behavior_type: behaviorType, notes: notes || '', recorder: recorder || 'الإدارة', sub_type: subType || 'إيجابي'
  }));
  await sb('positive_behaviors_log', 'POST', '', posRows);
  return { success: true, message: `تم تسجيل السلوك الإيجابي لـ ${studentsData.length} طالب ✅` };
}

async function logMessagesBatch(messages, sender, sc) {
  if (!Array.isArray(messages)) return true;
  const now = new Date().toISOString();
  const rows = messages.map(m => ({
    school_code: sc, student_name: m.studentName, class_name: m.className,
    violation_type: m.violationType || '', phone: m.phone || '', message_text: m.messageText || '',
    status: m.status || 'مرسلة', sender: sender || 'الإدارة', sub_type: m.subType || '',
    category: m.category || 'سلوكية', sent_at: now
  }));
  const result = await sb('messages_log', 'POST', '', rows);
  console.log('logMessagesBatch result:', JSON.stringify(result));
  return true;
}

// ═══════════════════════════════════════════════════════════
//  قراءة السجلات
// ═══════════════════════════════════════════════════════════
async function getViolationsLog(filterClass, filterDate, filterType, sc) {
  let params = `school_code=eq.${sc}&order=recorded_at.desc`;
  if (filterClass && filterClass !== 'الكل') params += `&class_name=eq.${encodeURIComponent(filterClass)}`;
  if (filterDate) {
    const d = filterDate.replace(/-/g, '/');
    const dStart = filterDate + 'T00:00:00';
    const dEnd   = filterDate + 'T23:59:59';
    params += `&recorded_at=gte.${dStart}&recorded_at=lte.${dEnd}`;
  }
  if (filterType && filterType !== 'الكل') params += `&violation_type=eq.${encodeURIComponent(filterType)}`;
  const rows = await sb('violations_log', 'GET', params);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    date: fmtDate(r.recorded_at), studentName: r.student_name, className: r.class_name,
    violationType: r.violation_type, notes: r.notes || '', recorder: r.recorder || '',
    severity: r.severity || 'بسيطة', followUp: r.follow_up || '',
    signature: r.student_signature || '', fingerprint: r.fingerprint || '',
    category: r.category || 'سلوكية', score: r.score || '0', subject: r.subject || '',
    treatmentDate: fmtDate(r.treatment_date), actionType: r.action_type || '',
    actionTaken: r.action_taken || '', visibleToParent: r.visible_to_parent || 'لا',
    referredToAdmin: r.referred_to_admin || 'لا', referralDate: fmtDate(r.referral_date),
    behaviorStatus: r.behavior_status || '', subType: r.sub_type || '',
    repeatCount: r.repeat_count || 1, degree: r.degree || r.severity || '1',
    _id: r.id
  }));
}

async function getMessagesLog(filterClass, filterDate, sc) {
  let params = `school_code=eq.${sc}&order=sent_at.desc`;
  if (filterClass && filterClass !== 'الكل') params += `&class_name=eq.${encodeURIComponent(filterClass)}`;
  if (filterDate) {
    params += `&sent_at=gte.${filterDate}T00:00:00&sent_at=lte.${filterDate}T23:59:59`;
  }
  const rows = await sb('messages_log', 'GET', params);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    date: fmtDate(r.sent_at), studentName: r.student_name, className: r.class_name,
    violationType: r.violation_type, phone: r.phone || '', messageText: r.message_text || '',
    status: r.status || '', sender: r.sender || 'الإدارة', subType: r.sub_type || '', category: r.category || 'سلوكية'
  }));
}

async function getPositiveBehaviorsLog(filterClass, filterDate, sc) {
  let params = `school_code=eq.${sc}&order=recorded_at.desc`;
  if (filterClass && filterClass !== 'الكل') params += `&class_name=eq.${encodeURIComponent(filterClass)}`;
  if (filterDate) params += `&recorded_at=gte.${filterDate}T00:00:00&recorded_at=lte.${filterDate}T23:59:59`;
  const rows = await sb('positive_behaviors_log', 'GET', params);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    date: fmtDate(r.recorded_at), studentName: r.student_name, className: r.class_name,
    behaviorType: r.behavior_type, notes: r.notes || '', recorder: r.recorder || '', subType: r.sub_type || 'إيجابي'
  }));
}

// ═══════════════════════════════════════════════════════════
//  تعديل السجلات
// ═══════════════════════════════════════════════════════════
async function findViolationId(date, studentName, violationType, sc) {
  // البحث بدقيقة ±
  const datePart = date.split(' ')[0];
  const rows = await sb('violations_log', 'GET',
    `school_code=eq.${sc}&student_name=eq.${encodeURIComponent(studentName)}&violation_type=eq.${encodeURIComponent(violationType)}&select=id,recorded_at&order=recorded_at.desc`);
  if (!Array.isArray(rows) || !rows.length) return null;
  const match = rows.find(r => fmtDate(r.recorded_at).startsWith(datePart));
  return match ? match.id : rows[0].id;
}

async function updateViolationLog(date, studentName, oldType, newType, newNotes, sc) {
  const id = await findViolationId(date, studentName, oldType, sc);
  if (!id) return { success: false };
  await sb('violations_log', 'PATCH', `id=eq.${id}`, { violation_type: newType, notes: newNotes || '' });
  return { success: true, message: 'تم التعديل ✅' };
}

async function deleteViolationLog(date, studentName, violationType, sc) {
  const id = await findViolationId(date, studentName, violationType, sc);
  if (!id) return { success: false };
  await sb('violations_log', 'DELETE', `id=eq.${id}`);
  return { success: true, message: 'تم الحذف ✅' };
}

async function addFollowUp(date, studentName, violationType, followUpText, behaviorStatus, sc) {
  const id = await findViolationId(date, studentName, violationType, sc);
  if (!id) return { success: false };
  const row = await sb('violations_log', 'GET', `id=eq.${id}&select=follow_up`);
  const prev = Array.isArray(row) && row.length ? (row[0].follow_up || '') : '';
  const nowShort = new Date().toLocaleString('ar-SA', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const newFollowUp = followUpText ? (prev ? prev + '\n' : '') + `[${nowShort}] ${followUpText}` : prev;
  const patch = {};
  if (followUpText) { patch.follow_up = newFollowUp; patch.treatment_date = new Date().toISOString(); }
  if (behaviorStatus) patch.behavior_status = behaviorStatus;
  await sb('violations_log', 'PATCH', `id=eq.${id}`, patch);
  return { success: true, message: 'تمت إضافة المتابعة ✅' };
}

async function setVisibleToParent(date, studentName, violationType, visible, sc) {
  const datePart = date.split(' ')[0];
  const rows = await sb('violations_log', 'GET',
    `school_code=eq.${sc}&student_name=eq.${encodeURIComponent(studentName)}&violation_type=eq.${encodeURIComponent(violationType)}&select=id,recorded_at`);
  if (!Array.isArray(rows)) return { success: false };
  const matches = rows.filter(r => fmtDate(r.recorded_at).startsWith(datePart));
  const toUpdate = matches.length ? matches : rows;
  for (const r of toUpdate) {
    await sb('violations_log', 'PATCH', `id=eq.${r.id}`, { visible_to_parent: visible ? 'نعم' : 'لا' });
  }
  return { success: toUpdate.length > 0 };
}

async function referViolationToAdmin(studentName, violationType, className, sc) {
  const now = new Date().toISOString();
  const rows = await sb('violations_log', 'GET',
    `school_code=eq.${sc}&student_name=eq.${encodeURIComponent(studentName)}&violation_type=eq.${encodeURIComponent(violationType)}&referred_to_admin=eq.لا&select=id`);
  if (!Array.isArray(rows) || !rows.length) return { success: false, message: 'لم يتم العثور على السجل أو أُحيل مسبقاً' };
  for (const r of rows) {
    await sb('violations_log', 'PATCH', `id=eq.${r.id}`, { referred_to_admin: 'نعم', referral_date: now });
  }
  return { success: true, message: 'تمت الإحالة للإدارة ✅' };
}

async function updateActionTaken(date, studentName, violationType, actionType, actionTaken, sc) {
  const id = await findViolationId(date, studentName, violationType, sc);
  if (!id) return { success: false };
  await sb('violations_log', 'PATCH', `id=eq.${id}`, { action_type: actionType || '', action_taken: actionTaken || '' });
  return { success: true, message: 'تم حفظ الإجراء ✅' };
}

// ═══════════════════════════════════════════════════════════
//  المعلمين
// ═══════════════════════════════════════════════════════════
async function getTeachers(sc) {
  const rows = await sb('teachers', 'GET', `school_code=eq.${sc}&order=name`);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({ name: r.name, subjects: r.subjects, classes: r.classes, code: r.code, active: r.active }));
}

async function addTeacher(name, subjects, classes, code, sc) {
  // تحقق من التكرار عبر كل المدارس
  const globalCheck = await sb('teachers', 'GET', `code=eq.${encodeURIComponent(code)}&select=school_code,name`);
  if (Array.isArray(globalCheck) && globalCheck.length) {
    const other = globalCheck.find(t => t.school_code !== sc);
    if (other) return { success: false, message: 'رمز الدخول هذا مستخدم في مدرسة أخرى ❌' };
    const same = globalCheck.find(t => t.school_code === sc);
    if (same) return { success: false, message: 'رمز الدخول هذا مستخدم مسبقاً ❌' };
  }
  await sb('teachers', 'POST', '', { school_code: sc, name, subjects, classes, code, active: 'نعم' });
  return { success: true, message: 'تمت إضافة المعلم ✅' };
}

async function updateTeacher(oldName, name, subjects, classes, code, active, sc) {
  // تحقق من التكرار عبر كل المدارس
  const globalCheck = await sb('teachers', 'GET', `code=eq.${encodeURIComponent(code)}&select=school_code,name`);
  if (Array.isArray(globalCheck) && globalCheck.length) {
    const conflict = globalCheck.find(t => !(t.school_code === sc && t.name === oldName));
    if (conflict) return { success: false, message: 'رمز الدخول مستخدم في مدرسة أخرى أو من معلم آخر ❌' };
  }
  await sb('teachers', 'PATCH', `school_code=eq.${sc}&name=eq.${encodeURIComponent(oldName)}`,
    { name, subjects, classes, code, active: active || 'نعم' });
  return { success: true, message: 'تم التعديل ✅' };
}

async function deleteTeacher(name, sc) {
  await sb('teachers', 'DELETE', `school_code=eq.${sc}&name=eq.${encodeURIComponent(name)}`);
  return { success: true };
}

async function deleteAllTeachers(sc) {
  await sb('teachers', 'DELETE', `school_code=eq.${sc}`);
  return { success: true };
}

async function upsertTeacher(name, subjects, classes, code, sc) {
  // تحقق من التكرار عبر كل المدارس
  const globalCheck = await sb('teachers', 'GET', `code=eq.${encodeURIComponent(code)}&select=school_code,name`);
  if (Array.isArray(globalCheck) && globalCheck.length) {
    const other = globalCheck.find(t => t.school_code !== sc);
    if (other) return { success: false, message: 'رمز الدخول مستخدم في مدرسة أخرى ❌' };
    // موجود في نفس المدرسة → تحديث
    const same = globalCheck.find(t => t.school_code === sc);
    if (same) {
      await sb('teachers', 'PATCH', `school_code=eq.${sc}&code=eq.${encodeURIComponent(code)}`,
        { name, subjects, classes, active: 'نعم' });
      return { success: true, updated: true };
    }
  }
  // جديد → إضافة
  await sb('teachers', 'POST', '', { school_code: sc, name, subjects, classes, code, active: 'نعم' });
  return { success: true, updated: false };
}

async function verifyTeacher(code, sc) {
  const rows = await sb('teachers', 'GET',
    `school_code=eq.${sc}&code=eq.${encodeURIComponent(code)}&active=eq.نعم&select=name,subjects,classes`);
  if (!Array.isArray(rows) || !rows.length) return null;
  const t = rows[0];
  return { name: t.name, subjects: t.subjects, classes: t.classes.split(',').map(c => c.trim()) };
}

// ═══════════════════════════════════════════════════════════
//  ملف الطالب الشامل
// ═══════════════════════════════════════════════════════════
async function getStudentProfile(studentName, className, viewerRole, sc) {
  const role = viewerRole || 'admin';

  // بيانات الطالب
  const stRows = await sb('students', 'GET',
    `school_code=eq.${sc}&name=eq.${encodeURIComponent(studentName)}&class_name=eq.${encodeURIComponent(className)}&select=phone,national_id`);
  let phone = '', nationalId = '';
  if (Array.isArray(stRows) && stRows.length) {
    phone = stRows[0].phone || '';
    nationalId = stRows[0].national_id || '';
  }

  // سجل المخالفات
  let vParams = `school_code=eq.${sc}&student_name=eq.${encodeURIComponent(studentName)}&class_name=eq.${encodeURIComponent(className)}&order=recorded_at.asc`;
  if (role === 'parent') vParams += `&visible_to_parent=eq.نعم`;
  const vRows = await sb('violations_log', 'GET', vParams);
  const allRecs = Array.isArray(vRows) ? vRows.map(r => ({
    date: fmtDate(r.recorded_at), type: r.violation_type, notes: r.notes || '',
    recorder: r.recorder || '', severity: r.severity || 'بسيطة', followUp: r.follow_up || '',
    signature: r.student_signature || '', fingerprint: r.fingerprint || '',
    category: r.category || 'سلوكية', score: r.score || '0', subject: r.subject || '',
    treatmentDate: fmtDate(r.treatment_date), actionType: r.action_type || '', actionTaken: r.action_taken || '',
    visibleToParent: r.visible_to_parent || 'لا', referredToAdmin: r.referred_to_admin || 'لا',
    referralDate: fmtDate(r.referral_date)
  })) : [];

  const violations      = allRecs.filter(r => r.category === 'سلوكية');
  const classViolations = allRecs.filter(r => r.category === 'صفية');

  // السلوك الإيجابي
  const pRows = await sb('positive_behaviors_log', 'GET',
    `school_code=eq.${sc}&student_name=eq.${encodeURIComponent(studentName)}&class_name=eq.${encodeURIComponent(className)}&order=recorded_at.asc`);
  const positiveBehaviors = Array.isArray(pRows) ? pRows.map(r => ({
    date: fmtDate(r.recorded_at), type: r.behavior_type, notes: r.notes || '',
    recorder: r.recorder || '', subType: r.sub_type || 'إيجابي', category: 'إيجابية', visibleToParent: 'نعم'
  })) : [];

  // الرسائل
  const mRows = await sb('messages_log', 'GET',
    `school_code=eq.${sc}&student_name=eq.${encodeURIComponent(studentName)}&class_name=eq.${encodeURIComponent(className)}&select=sent_at,violation_type,sender`);
  const messages = Array.isArray(mRows) ? mRows.map(r => ({ date: fmtDate(r.sent_at), type: r.violation_type, sender: r.sender || '' })) : [];

  // حساب الدرجات
  let score = 100;
  const negWithScore = violations.filter(r => r.score && r.score !== '0' && !isNaN(parseFloat(r.score)));
  if (negWithScore.length) {
    score = Math.max(0, Math.min(100, 100 - negWithScore.reduce((s, r) => s + parseFloat(r.score || 0), 0)));
  } else {
    const sevPoints = { بسيطة: 5, متوسطة: 10, خطيرة: 20 };
    violations.forEach(v => { score -= (sevPoints[v.severity] || 5); });
    score = Math.max(0, score);
  }

  let classScore = 0;
  classViolations.filter(r => r.score && r.score !== '0').forEach(r => { classScore -= parseFloat(r.score || 0); });
  if (!classViolations.filter(r => r.score && r.score !== '0').length) classScore = -classViolations.length;

  let posScore = 80;
  positiveBehaviors.filter(r => r.score && r.score !== '0').forEach(r => { posScore += parseFloat(r.score || 0); });
  if (!positiveBehaviors.filter(r => r.score && r.score !== '0').length) posScore = 80 + positiveBehaviors.length;

  const typeCounts = {};
  violations.forEach(v => { typeCounts[v.type] = (typeCounts[v.type] || 0) + 1; });
  const posTypeCounts = {};
  positiveBehaviors.forEach(v => { posTypeCounts[v.type] = (posTypeCounts[v.type] || 0) + 1; });

  let level = 'ممتاز', color = '#06D6A0';
  if (score < 40) { level = 'خطير'; color = '#DC2626'; }
  else if (score < 60) { level = 'ضعيف'; color = '#EF476F'; }
  else if (score < 75) { level = 'مقبول'; color = '#F0A500'; }
  else if (score < 90) { level = 'جيد'; color = '#3B82F6'; }

  return {
    name: studentName, className, phone, nationalId, score, level, color,
    classScore, posScore,
    totalViolations: violations.length, totalClassViolations: classViolations.length,
    totalPositive: positiveBehaviors.length, totalMessages: messages.length,
    typeBreakdown: Object.entries(typeCounts).sort((a,b) => b[1]-a[1]).map(e => ({ type: e[0], count: e[1] })),
    posBreakdown: Object.entries(posTypeCounts).sort((a,b) => b[1]-a[1]).map(e => ({ type: e[0], count: e[1] })),
    violations: violations.reverse(), classViolations: classViolations.reverse(),
    positiveBehaviors: positiveBehaviors.reverse(), messages: messages.reverse()
  };
}

// ═══════════════════════════════════════════════════════════
//  الإحصاءات
// ═══════════════════════════════════════════════════════════
async function getAdvancedStats(dateFilter, sc) {
  // parallel fetching
  const [studentsRes, teachersRes, violationsRes, messagesRes, posRes, reportsRes] = await Promise.all([
    sb('students', 'GET', `school_code=eq.${sc}&select=id`),
    sb('teachers', 'GET', `school_code=eq.${sc}&select=id`),
    sb('violations_log', 'GET', `school_code=eq.${sc}&select=class_name,violation_type,category,behavior_status,sub_type,recorded_at`),
    sb('messages_log', 'GET', `school_code=eq.${sc}&select=sent_at`),
    sb('violations_log', 'GET', `school_code=eq.${sc}&category=eq.إيجابية&select=sub_type,recorded_at`),
    sb('reports', 'GET', `school_code=eq.${sc}&select=student_name,violation_type,read_at,created_at`)
  ]);

  let fv = Array.isArray(violationsRes) ? violationsRes : [];
  let fm = Array.isArray(messagesRes) ? messagesRes : [];
  let fp = Array.isArray(violationsRes) ? violationsRes.filter(v => v.category === 'إيجابية' || v.category === 'positive' || v.category === 'إيجابي') : [];
  const allReports = Array.isArray(reportsRes) ? reportsRes : [];

  if (dateFilter) {
    fv = fv.filter(v => fmtDate(v.recorded_at).startsWith(dateFilter.replace(/-/g,'/')));
    fm = fm.filter(m => fmtDate(m.sent_at).startsWith(dateFilter.replace(/-/g,'/')));
    fp = fp.filter(p => fmtDate(p.recorded_at).startsWith(dateFilter.replace(/-/g,'/')));
  }

  const cc = {}, tc = {}, tcCls = {};
  fv.forEach(v => { cc[v.class_name] = (cc[v.class_name]||0)+1; });
  fv.filter(v => v.category === 'سلوكية').forEach(v => { tc[v.violation_type] = (tc[v.violation_type]||0)+1; });
  fv.filter(v => v.category === 'صفية').forEach(v => { tcCls[v.violation_type] = (tcCls[v.violation_type]||0)+1; });

  const totalPositive  = fp.filter(p => p.sub_type !== 'متميز').length;
  const totalDistinct  = fp.filter(p => p.sub_type === 'متميز').length;
  const totalReportsResponded = allReports.filter(r => r.read_at).length;

  const rc = {};
  allReports.forEach(r => { if (r.student_name) rc[r.student_name] = (rc[r.student_name]||0)+1; });
  const topReports = Object.entries(rc).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => ({ name: e[0], count: e[1] }));

  return {
    totalStudents: Array.isArray(studentsRes) ? studentsRes.length : 0,
    totalTeachers: Array.isArray(teachersRes) ? teachersRes.length : 0,
    totalViolations: fv.filter(v => v.category === 'سلوكية').length,
    totalClassViolations: fv.filter(v => v.category === 'صفية').length,
    totalMessages: fm.length, totalPositive, totalDistinct,
    totalReports: allReports.length, totalReportsResponded,
    totalImproved: fv.filter(v => v.behavior_status === 'تحسن' && v.category === 'سلوكية').length,
    totalClassImproved: fv.filter(v => v.behavior_status === 'تحسن' && v.category === 'صفية').length,
    topReports,
    topClass: Object.keys(cc).length ? Object.entries(cc).sort((a,b) => b[1]-a[1])[0][0] : '-',
    classRanking: Object.entries(cc).sort((a,b) => b[1]-a[1]).map(e => ({ name: e[0], count: e[1] })),
    typeRanking: Object.entries(tc).sort((a,b) => b[1]-a[1]).map(e => ({ name: e[0], count: e[1] })),
    classTypeRanking: Object.entries(tcCls).sort((a,b) => b[1]-a[1]).map(e => ({ name: e[0], count: e[1] })),
    positiveRanking: Object.entries(
      fp.reduce((acc, v) => { acc[v.violation_type || v.name || 'إيجابي'] = (acc[v.violation_type || v.name || 'إيجابي'] || 0) + 1; return acc; }, {})
    ).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => ({ name: e[0], count: e[1] }))
  };
}

async function getWeeklyReport(sc) {
  const wStr = new Date(Date.now() - 7*24*60*60*1000).toISOString();
  const rows = await sb('violations_log', 'GET',
    `school_code=eq.${sc}&recorded_at=gte.${wStr}&select=student_name,class_name,violation_type,severity`);
  if (!Array.isArray(rows)) return { total: 0, byClass: [], byType: [], bySeverity: [], topStudents: [] };
  const cc={}, tc={}, sc2={}, stc={};
  rows.forEach(r => {
    cc[r.class_name]=(cc[r.class_name]||0)+1;
    tc[r.violation_type]=(tc[r.violation_type]||0)+1;
    sc2[r.severity]=(sc2[r.severity]||0)+1;
    stc[r.student_name]=(stc[r.student_name]||0)+1;
  });
  return {
    total: rows.length,
    byClass: Object.entries(cc).sort((a,b)=>b[1]-a[1]).map(e=>({name:e[0],count:e[1]})),
    byType: Object.entries(tc).sort((a,b)=>b[1]-a[1]).map(e=>({name:e[0],count:e[1]})),
    bySeverity: Object.entries(sc2).sort((a,b)=>b[1]-a[1]).map(e=>({name:e[0],count:e[1]})),
    topStudents: Object.entries(stc).sort((a,b)=>b[1]-a[1]).slice(0,10).map(e=>({name:e[0],count:e[1]}))
  };
}

async function getMonthlyChartData(sc) {
  const rows = await sb('violations_log', 'GET', `school_code=eq.${sc}&select=recorded_at`);
  if (!Array.isArray(rows)) return [];
  const months = {};
  rows.forEach(r => {
    const m = fmtDate(r.recorded_at).substring(0,7);
    months[m] = (months[m]||0)+1;
  });
  return Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0])).map(e=>({month:e[0],count:e[1]}));
}

async function getHeatmapData(sc) {
  const rows = await sb('violations_log', 'GET', `school_code=eq.${sc}&select=recorded_at`);
  const days = [0,0,0,0,0,0,0];
  if (Array.isArray(rows)) rows.forEach(r => { const d = new Date(r.recorded_at); if (!isNaN(d)) days[d.getDay()]++; });
  return { days };
}

async function getRepeatedViolations(filterClasses, sc) {
  let params = `school_code=eq.${sc}&select=student_name,class_name,violation_type,recorder,severity,action_type,action_taken,referred_to_admin,recorded_at`;
  const rows = await sb('violations_log', 'GET', params);
  if (!Array.isArray(rows)) return [];
  let data = rows.map(r => ({ ...r, date: fmtDate(r.recorded_at) }));
  if (filterClasses && filterClasses.length) data = data.filter(r => filterClasses.includes(r.class_name));
  const counts = {};
  data.forEach(r => { const key = r.student_name+'|||'+r.class_name+'|||'+r.violation_type; counts[key]=(counts[key]||0)+1; });
  const seen={}, alerts=[];
  [...data].reverse().forEach(r => {
    const key = r.student_name+'|||'+r.class_name+'|||'+r.violation_type;
    if (counts[key]>=3 && !seen[key]) {
      seen[key]=true;
      alerts.push({ studentName:r.student_name, className:r.class_name, violationType:r.violation_type,
        recorder:r.recorder, severity:r.severity, actionType:r.action_type, actionTaken:r.action_taken,
        referredToAdmin:r.referred_to_admin, date:r.date, count:counts[key] });
    }
  });
  return alerts.sort((a,b)=>b.count-a.count);
}

async function getRepeatedViolationsForAdmin(sc) {
  return getRepeatedViolations(null, sc);
}

async function getReferredViolations(sc) {
  const rows = await sb('violations_log', 'GET',
    `school_code=eq.${sc}&referred_to_admin=eq.نعم&order=referral_date.desc&select=*`);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    date: fmtDate(r.recorded_at), studentName: r.student_name, className: r.class_name,
    violationType: r.violation_type, notes: r.notes||'', recorder: r.recorder||'',
    severity: r.severity||'بسيطة', category: r.category||'سلوكية',
    actionType: r.action_type||'', actionTaken: r.action_taken||'',
    visibleToParent: r.visible_to_parent||'لا', referredToAdmin: r.referred_to_admin||'لا',
    referralDate: fmtDate(r.referral_date), behaviorStatus: r.behavior_status||'',
    adminDecision: r.treatment_date ? fmtDate(r.treatment_date) : '',
    followUpNotes: r.follow_up || '',
    repeatCount: r.repeat_count || 1,
    referralNote: r.referral_note || '',
    subject: r.subject || ''
  }));
}

async function getMyViolations(dateFilter, teacherName, sc) {
  let params = `school_code=eq.${sc}&select=*&order=recorded_at.desc`;
  if (teacherName) params += `&recorder=eq.${encodeURIComponent(teacherName)}`;
  if (dateFilter) params += `&recorded_at=gte.${dateFilter}T00:00:00&recorded_at=lte.${dateFilter}T23:59:59`;
  const rows = await sb('violations_log', 'GET', params);
  if (!Array.isArray(rows)) return { violations: [] };
  return { violations: rows.map(r => ({
    date: fmtDate(r.recorded_at), studentName: r.student_name, className: r.class_name,
    violationType: r.violation_type, notes: r.notes||'', recorder: r.recorder||'',
    severity: r.severity||'بسيطة', followUp: r.follow_up||'', signature: r.student_signature||'',
    fingerprint: r.fingerprint||'', category: r.category||'سلوكية', subject: r.subject||'',
    actionType: r.action_type||'', actionTaken: r.action_taken||'',
    visibleToParent: r.visible_to_parent||'لا', referredToAdmin: r.referred_to_admin||'لا',
    behaviorStatus: r.behavior_status||''
  })) };
}

// ═══════════════════════════════════════════════════════════
//  المحاضر
// ═══════════════════════════════════════════════════════════
async function generateReportNumber(sc) {
  const rows = await sb('report_counters', 'GET', `school_code=eq.${sc}`);
  let current = 0;
  if (Array.isArray(rows) && rows.length) {
    current = rows[0].counter + 1;
    await sb('report_counters', 'PATCH', `school_code=eq.${sc}`, { counter: current });
  } else {
    current = 1;
    await sb('report_counters', 'POST', '', { school_code: sc, counter: current });
  }
  return '#' + String(current).padStart(4, '0');
}

async function saveReport(data, sc) {
  const reportNum = (data.customReportNum && String(data.customReportNum).trim())
    ? '#' + String(data.customReportNum).replace(/^#/, '')
    : await generateReportNumber(sc);
  await sb('reports', 'POST', '', {
    school_code: sc, report_num: reportNum, student_name: data.studentName||'',
    class_name: data.className||'', violation_type: data.violationType||'',
    region_name: data.regionName||'', school_name: data.schoolName||'',
    reporter_role: data.reporterRole||'', reporter_name: data.reporterName||'',
    student_signature: data.studentSignature||'', reporter_signature: data.reporterSignature||'',
    status: 'بانتظار الاستلام', violation_date: data.violationDate || new Date().toISOString(),
    notes: data.bodyText || data.notes || ''
  });
  return { success: true, reportNum, message: 'تم حفظ المحضر ✅' };
}

async function getReports(sc) {
  const rows = await sb('reports', 'GET', `school_code=eq.${sc}&order=created_at.desc`);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    reportNum: r.report_num, createdAt: fmtDate(r.created_at), studentName: r.student_name,
    className: r.class_name, violationType: r.violation_type, regionName: r.region_name||'',
    schoolName: r.school_name||'', reporterRole: r.reporter_role||'', reporterName: r.reporter_name||'',
    studentSig: r.student_signature||'', reporterSig: r.reporter_signature||'',
    status: r.status||'بانتظار الاستلام', receivedAt: fmtDate(r.received_at), readAt: fmtDate(r.read_at),
    violationDate: fmtDate(r.violation_date), notes: r.notes||'', bodyText: r.notes||''
  }));
}

async function getReportByNum(reportNum, sc) {
  const rows = await sb('reports', 'GET', `school_code=eq.${sc}&report_num=eq.${encodeURIComponent(reportNum)}`);
  if (!Array.isArray(rows) || !rows.length) return null;
  const r = rows[0];
  return {
    reportNum: r.report_num, createdAt: fmtDate(r.created_at), studentName: r.student_name,
    className: r.class_name, violationType: r.violation_type, regionName: r.region_name||'',
    schoolName: r.school_name||'', reporterRole: r.reporter_role||'', reporterName: r.reporter_name||'',
    studentSig: r.student_signature||'', reporterSig: r.reporter_signature||'',
    status: r.status||'بانتظار الاستلام', receivedAt: fmtDate(r.received_at), readAt: fmtDate(r.read_at),
    violationDate: fmtDate(r.violation_date), notes: r.notes||''
  };
}

async function updateReportStatus(reportNum, status, sc) {
  const now = new Date().toISOString();
  const patch = { status };
  if (status === 'تم الاستلام') patch.received_at = now;
  if (status === 'تم الاطلاع')  patch.read_at = now;
  await sb('reports', 'PATCH', `school_code=eq.${sc}&report_num=eq.${encodeURIComponent(reportNum)}`, patch);
  return { success: true };
}

async function getReportsByStudent(studentName, className, sc) {
  const rows = await sb('reports', 'GET',
    `school_code=eq.${sc}&student_name=eq.${encodeURIComponent(studentName)}&class_name=eq.${encodeURIComponent(className)}&order=created_at.desc`);
  if (!Array.isArray(rows)) return [];
  return rows.map(r => ({
    reportNum: r.report_num, createdAt: fmtDate(r.created_at), studentName: r.student_name,
    className: r.class_name, violationType: r.violation_type, status: r.status||'بانتظار الاستلام',
    studentSig: r.student_signature||'', reporterSig: r.reporter_signature||'',
    violationDate: fmtDate(r.violation_date), notes: r.notes||''
  }));
}

async function getFullReportData(dateFrom, dateTo, sc) {
  const [violationsRes, messagesRes, posRes, reportsRes] = await Promise.all([
    sb('violations_log', 'GET', `school_code=eq.${sc}&select=class_name,violation_type,category,behavior_status,sub_type,student_name,recorded_at`),
    sb('messages_log', 'GET', `school_code=eq.${sc}&select=sent_at`),
    sb('violations_log', 'GET', `school_code=eq.${sc}&category=eq.إيجابية&select=sub_type,recorded_at`),
    sb('reports', 'GET', `school_code=eq.${sc}&select=student_name,violation_type,created_at,read_at`)
  ]);
  const inRange = (dateStr) => {
    if (!dateFrom && !dateTo) return true;
    const d = dateStr.replace(/\//g,'-');
    if (dateFrom && d < dateFrom.replace(/\//g,'-')) return false;
    if (dateTo && d > dateTo.replace(/\//g,'-')) return false;
    return true;
  };
  const fv = (Array.isArray(violationsRes)?violationsRes:[]).filter(v=>inRange(fmtDate(v.recorded_at)));
  const fm = (Array.isArray(messagesRes)?messagesRes:[]).filter(m=>inRange(fmtDate(m.sent_at)));
  const fp = (Array.isArray(violationsRes)?violationsRes:[]).filter(v=>(v.category==='إيجابية'||v.category==='positive')&&inRange(fmtDate(v.recorded_at)));
  const allRpts = Array.isArray(reportsRes)?reportsRes:[];
  const cc={},tc={};
  fv.forEach(v=>{cc[v.class_name]=(cc[v.class_name]||0)+1;});
  fv.filter(v=>v.category==='سلوكية').forEach(v=>{tc[v.violation_type]=(tc[v.violation_type]||0)+1;});
  const ps={},pc={};
  fp.forEach(p=>{ps[p.student_name]=(ps[p.student_name]||0)+1;pc[p.class_name]=(pc[p.class_name]||0)+1;});
  const stCount={};
  fv.filter(v=>v.category==='سلوكية').forEach(v=>{stCount[v.student_name]=(stCount[v.student_name]||0)+1;});
  return {
    totalViolations: fv.filter(v=>v.category==='سلوكية').length,
    totalClassViolations: fv.filter(v=>v.category==='صفية').length,
    totalMessages: fm.length,
    totalPositive: fp.filter(p=>p.sub_type!=='متميز').length,
    totalDistinct: fp.filter(p=>p.sub_type==='متميز').length,
    totalReports: allRpts.length,
    totalReportsResponded: allRpts.filter(r=>r.read_at).length,
    totalImproved: fv.filter(v=>v.behavior_status==='تحسن').length,
    repeatCount: Object.values(stCount).filter(c=>c>1).length,
    classRanking: Object.entries(cc).sort((a,b)=>b[1]-a[1]).map(e=>({name:e[0],count:e[1]})),
    typeRanking: Object.entries(tc).sort((a,b)=>b[1]-a[1]).map(e=>({name:e[0],count:e[1]})),
    positiveStudents: Object.entries(ps).sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>({name:e[0],count:e[1]})),
    positiveClasses: Object.entries(pc).sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>({name:e[0],count:e[1]})),
    reportsList: allRpts.map(r=>({studentName:r.student_name,violationType:r.violation_type,createdAt:fmtDate(r.created_at),status:r.read_at?'تم الاطلاع':'بانتظار الاستلام'}))
  };
}

// ═══════════════════════════════════════════════════════════
//  الإعدادات المخصصة
// ═══════════════════════════════════════════════════════════
const DEFAULT_SETTINGS = {
  headerTitle:'سجل المخالفات السلوكية',headerSubtitle:'نظام إدارة المخالفات والتواصل',
  headerExtraText:'',headerExtraPosition:'subtitle',headerExtraSize:'13px',
  headerExtraColor:'#FFD166',headerIcon:'gavel',headerBgColor:'#0A5C44',
  headerTextColor:'#ffffff',headerIconBg:'#C9860A',headerIconColor:'#0A5C44',
  footerText:'تصميم وفكرة وتنفيذ',footerAuthor:'M E H',footerLink:'',
  footerCopyright:'جميع الحقوق محفوظة',footerBgColor:'#062E22',
  footerTextColor:'#b0b0b0',footerAuthorColor:'#C9860A',
  tHeaderBg:'#0A5C44',tHeaderColor:'#ffffff',tFooterBg:'#062E22',
  tFooterColor:'#b0b0b0',tTitleSize:'16px',tSubSize:'11px',
  tTitlePos:'right',tSubPos:'right',tThemeColor:'#0A5C44',
  tLoginBg1:'#062E22',tLoginBg2:'#0A5C44',tLoginIconBg:'#C9860A',
  tLoginIconColor:'#0A5C44',tHeaderIconBg:'#C9860A',tHeaderIconColor:'#0A5C44',
  parentHeaderBg:'#0A5C44',parentHeaderColor:'#ffffff',
  parentHeaderTitle:'بوابة ولي الأمر',parentHeaderSubtitle:'متابعة سلوك الطالب',
  parentHeaderIcon:'family_restroom',parentHeaderIconBg:'#C9860A',
  parentHeaderIconColor:'#0A5C44',parentLoginTitle:'أهلاً بك في بوابة ولي الأمر',
  parentLoginSubtitle:'أدخل رقم هوية الطالب للاطلاع على سلوكه',
  parentFooterBg:'#062E22',parentFooterText:'#b0b0b0',parentFooterAuthorColor:'#C9860A'
};

async function getCustomSettings(sc) {
  // جلب gender من جدول schools
  const schoolRows = await sb('schools', 'GET', `school_code=eq.${sc}&select=gender`);
  const gender = (Array.isArray(schoolRows) && schoolRows.length) ? (schoolRows[0].gender || 'male') : 'male';

  const rows = await sb('custom_settings', 'GET', `school_code=eq.${sc}`);
  let settings = DEFAULT_SETTINGS;
  if (Array.isArray(rows) && rows.length) {
    const s = rows[0].settings;
    settings = (s && s.admin) ? s.admin : (s || DEFAULT_SETTINGS);
  }
  return { ...settings, gender };
}

async function getPageSettings(sc, page) {
  // جلب gender من جدول schools
  const schoolRows = await sb('schools', 'GET', `school_code=eq.${sc}&select=gender`);
  const gender = (Array.isArray(schoolRows) && schoolRows.length) ? (schoolRows[0].gender || 'male') : 'male';

  const rows = await sb('custom_settings', 'GET', `school_code=eq.${sc}`);
  let settings = {};
  if (Array.isArray(rows) && rows.length) {
    const s = rows[0].settings;
    if (s && s[page]) settings = s[page];
    else if (s && !s.admin) settings = s;
  }
  return { ...settings, gender };
}

async function saveCustomSettings(settings, sc) {
  const existing = await sb('custom_settings', 'GET', `school_code=eq.${sc}`);
  if (Array.isArray(existing) && existing.length) {
    await sb('custom_settings', 'PATCH', `school_code=eq.${sc}`, { settings, updated_at: new Date().toISOString() });
  } else {
    await sb('custom_settings', 'POST', '', { school_code: sc, settings });
  }
  return { success: true, message: 'تم حفظ الإعدادات ✅' };
}

async function getLastRegionName(sc) {
  const rows = await sb('custom_settings', 'GET', `school_code=eq.${sc}&select=settings`);
  if (Array.isArray(rows) && rows.length) return rows[0].settings?.lastRegionName || '';
  return '';
}
