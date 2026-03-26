// ═══════════════════════════════════════════════════════════
//  api-client.js — بديل google.script.run للـ Netlify
//  يُضمَّن في كل صفحة HTML
// ═══════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ── إعداد المدرسة ──
  // schoolCode يُقرأ من: localStorage أو URL param أو الإعداد الافتراضي
  function getSchoolCode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('school') ||
           localStorage.getItem('schoolCode') ||
           'SCH001'; // الافتراضي
  }

  // ── عنوان الـ API ──
  const API_URL = '/api';

  // ── الدالة الأساسية للاستدعاء ──
  async function callAPI(action, params = {}) {
    const schoolCode = getSchoolCode();
    const body = { action, schoolCode, ...params };
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error(`API Error [${action}]:`, e);
      throw e;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  محاكي google.script.run
  //  الاستخدام: GAS.functionName(args...).then(cb).catch(err)
  //  أو: await GAS.functionName(args...)
  // ═══════════════════════════════════════════════════════════
  const GAS = {};

  // ── تعريف كل الدوال ──
  const API_FUNCTIONS = {
    // دخول
    doLogin:               (password)                => callAPI('doLogin', { password }),
    doTeacherLogin:        (code)                    => callAPI('doTeacherLogin', { code }),
    doUnifiedLogin:        (credential)              => callAPI('doUnifiedLogin', { credential }),

    // فصول
    getClasses:            ()                        => callAPI('getClasses'),
    addClass:              (name)                    => callAPI('addClass', { name }),
    deleteClass:           (name)                    => callAPI('deleteClass', { name }),
    syncClassesNow:        ()                        => callAPI('syncClassesNow'),

    // طلاب
    getStudentsByClass:    (className)               => callAPI('getStudentsByClass', { className }),
    addStudentsBatch:      (className, names, phones, ids) => callAPI('addStudentsBatch', { className, names, phones, ids }),
    updateStudent:         (className, oldName, newName, newPhone, newId) => callAPI('updateStudent', { className, oldName, newName, newPhone, newId }),
    deleteStudent:         (className, studentName)  => callAPI('deleteStudent', { className, studentName }),
    deleteStudentsByClass: (className)               => callAPI('deleteStudentsByClass', { className }),
    importStudentsBatch:   (payload, mode)           => callAPI('importStudentsBatch', { payload, mode }),
    verifyParentById:      (nationalId)              => callAPI('verifyParentById', { nationalId }),

    // المخالفات الثابتة الجديدة
    getFixedViolations:    (body)              => callAPI('getFixedViolations', body),
    getSchoolStage:        ()                  => callAPI('getSchoolStage'),
    getRepeatCount:        (studentName, violationName) => callAPI('getRepeatCount', { studentName, violationName }),
    recordFixedViolation:  (body)              => callAPI('recordFixedViolation', body),

    // أنواع المخالفات
    getViolationTypes:           ()                  => callAPI('getViolationTypes'),
    addViolationTypesBatch:      (types, messages, severities) => callAPI('addViolationTypesBatch', { types, messages, severities }),
    updateViolationType:         (oldType, newType, newMessage, newSeverity) => callAPI('updateViolationType', { oldType, newType, newMessage, newSeverity }),
    deleteViolationType:         (typeName)          => callAPI('deleteViolationType', { typeName }),

    // مخالفات صفية
    getClassViolationTypes:      ()                  => callAPI('getClassViolationTypes'),
    addClassViolationTypesBatch: (types, messages, severities) => callAPI('addClassViolationTypesBatch', { types, messages, severities }),
    updateClassViolationType:    (oldType, newType, newMessage, newSeverity) => callAPI('updateClassViolationType', { oldType, newType, newMessage, newSeverity }),
    deleteClassViolationType:    (typeName)          => callAPI('deleteClassViolationType', { typeName }),

    // سلوكيات إيجابية
    getPositiveBehaviorTypes:      ()                => callAPI('getPositiveBehaviorTypes'),
    addPositiveBehaviorTypesBatch: (types, messages, scores, subTypes) => callAPI('addPositiveBehaviorTypesBatch', { types, messages, scores, subTypes }),
    updatePositiveBehaviorType:    (oldType, newType, newMessage, newScore, newSubType) => callAPI('updatePositiveBehaviorType', { oldType, newType, newMessage, newScore, newSubType }),
    deletePositiveBehaviorType:    (typeName)        => callAPI('deletePositiveBehaviorType', { typeName }),

    // تسجيل
    recordViolation: function(studentsData, violationType, notes, recorder, severity, signature, fingerprint, category, score, subject, actionType, actionTaken, subType, visibleToParentOverride) {
      return callAPI('recordViolation', { studentsData, violationType, notes, recorder, severity, signature, fingerprint, category, score, subject, actionType, actionTaken, subType, visibleToParentOverride });
    },
    recordPositiveBehavior: function(studentsData, behaviorType, notes, recorder, score, subType, sendMessage) {
      return callAPI('recordPositiveBehavior', { studentsData, behaviorType, notes, recorder, score, subType, sendMessage });
    },
    logMessagesBatch:      (messages, sender)        => callAPI('logMessagesBatch', { messages, sender }),

    // قراءة سجلات
    getViolationsLog:      (filterClass, filterDate, filterType) => callAPI('getViolationsLog', { filterClass, filterDate, filterType }),
    getMessagesLog:        (filterClass, filterDate) => callAPI('getMessagesLog', { filterClass, filterDate }),
    getPositiveBehaviorsLog:(filterClass, filterDate)=> callAPI('getPositiveBehaviorsLog', { filterClass, filterDate }),
    deletePositiveBehaviorLog: (date, studentName, behaviorType) => callAPI('deletePositiveBehaviorLog', { date, studentName, behaviorType }),

    // تعديل سجلات
    updateViolationLog:    (date, studentName, oldType, newType, newNotes) => callAPI('updateViolationLog', { date, studentName, oldType, newType, newNotes }),
    deleteViolationLog:    (date, studentName, violationType) => callAPI('deleteViolationLog', { date, studentName, violationType }),
    addFollowUp:           (date, studentName, violationType, followUpText, behaviorStatus) => callAPI('addFollowUp', { date, studentName, violationType, followUpText, behaviorStatus }),
    setVisibleToParent:    (date, studentName, violationType, visible) => callAPI('setVisibleToParent', { date, studentName, violationType, visible }),
    referViolationToAdmin: (studentName, violationType, className) => callAPI('referViolationToAdmin', { studentName, violationType, className }),
    updateActionTaken:     (date, studentName, violationType, actionType, actionTaken) => callAPI('updateActionTaken', { date, studentName, violationType, actionType, actionTaken }),
    adminApproveVisibility:(date, studentName, violationType, visible) => callAPI('adminApproveVisibility', { date, studentName, violationType, visible }),

    // معلمين
    getTeachers:      ()                             => callAPI('getTeachers'),
    addTeacher:       (name, subjects, classes, code)=> callAPI('addTeacher', { name, subjects, classes, code }),
    updateTeacher:    (oldName, name, subjects, classes, code, active) => callAPI('updateTeacher', { oldName, name, subjects, classes, code, active }),
    deleteTeacher:    (name)                         => callAPI('deleteTeacher', { name }),
    deleteAllTeachers:()                             => callAPI('deleteAllTeachers'),

    // إحصاءات
    getAdvancedStats:              (dateFilter)      => callAPI('getAdvancedStats', { dateFilter }),
    getWeeklyReport:               ()                => callAPI('getWeeklyReport'),
    getMonthlyChartData:           ()                => callAPI('getMonthlyChartData'),
    getHeatmapData:                ()                => callAPI('getHeatmapData'),
    getRepeatedViolations:         (filterClasses)   => callAPI('getRepeatedViolations', { filterClasses }),
    getRepeatedViolationsForAdmin: ()                => callAPI('getRepeatedViolationsForAdmin'),
    getReferredViolations:         ()                => callAPI('getReferredViolations'),
    getMyReferredViolations:       (teacherName)      => callAPI('getMyReferredViolations', { teacherName }),
    getMyViolations:               (dateFilter, teacherName) => callAPI('getMyViolations', { dateFilter, teacherName }),

    // ملف الطالب
    getStudentProfile: (studentName, className, viewerRole) => callAPI('getStudentProfile', { studentName, className, viewerRole }),

    // محاضر
    saveReport:         (data)                       => callAPI('saveReport', { data }),
    getReports:         ()                           => callAPI('getReports'),
    getReportByNum:     (reportNum)                  => callAPI('getReportByNum', { reportNum }),
    updateReportStatus: (reportNum, status)          => callAPI('updateReportStatus', { reportNum, status }),
    getParentSettings:     ()                            => callAPI('getParentSettings', {}),
    getStudentProfile:     (studentName, className, viewerRole) => callAPI('getStudentProfile', { studentName, className, viewerRole }),
    getReportsByStudent:   (studentName, className)      => callAPI('getReportsByStudent', { studentName, className }),
    getReportsByStudent:(studentName, className)     => callAPI('getReportsByStudent', { studentName, className }),
    getFullReportData:  (dateFrom, dateTo)           => callAPI('getFullReportData', { dateFrom, dateTo }),
    getLastRegionName:  ()                           => callAPI('getLastRegionName'),

    // إعدادات
    getCustomSettings:  ()                           => callAPI('getCustomSettings'),
    saveCustomSettings: (settings)                   => callAPI('saveCustomSettings', { settings }),
    getSchoolCode:      ()                           => Promise.resolve({ code: getSchoolCode() }),

    // روابط
    getTeacherUrl:      ()                           => callAPI('getTeacherUrl'),
    getParentUrl:       ()                           => callAPI('getParentUrl'),
    getSpreadsheetUrl:  ()                           => Promise.resolve({ url: '#' }),
    initializeSheets:   ()                           => callAPI('initializeSheets'),
  };

  // ── تحويل google.script.run إلى GAS ──
  // المحاكاة الكاملة لـ withSuccessHandler / withFailureHandler
  function makeRunner() {
    let _successHandler = null;
    let _failureHandler = null;

    const runner = {
      withSuccessHandler(fn) { _successHandler = fn; return runner; },
      withFailureHandler(fn) { _failureHandler = fn; return runner; }
    };

    // إضافة كل الدوال للـ runner
    Object.entries(API_FUNCTIONS).forEach(([name, fn]) => {
      runner[name] = function(...args) {
        fn(...args)
          .then(result => { if (_successHandler) _successHandler(result); })
          .catch(err   => { if (_failureHandler) _failureHandler(err); else console.error(err); });
      };
    });

    return runner;
  }

  // ── تعريف google.script.run ──
  // هذا يستبدل google.script.run تلقائياً في جميع الصفحات
  window.google = window.google || {};
  window.google.script = window.google.script || {};

  // كل مرة يُنشأ فيها .withSuccessHandler أو يُستدعى فيها دالة مباشرة
  window.google.script.run = new Proxy({}, {
    get(target, prop) {
      if (prop === 'withSuccessHandler' || prop === 'withFailureHandler') {
        return function(fn) {
          const r = makeRunner();
          return r[prop](fn);
        };
      }
      // استدعاء مباشر بدون handler
      if (API_FUNCTIONS[prop]) {
        return function(...args) {
          API_FUNCTIONS[prop](...args).catch(e => console.error(`GAS.${prop} error:`, e));
        };
      }
      return function() { console.warn(`GAS: Unknown function: ${prop}`); };
    }
  });

  // ── API مباشر للاستخدام مع async/await ──
  window.GAS = API_FUNCTIONS;

  // ── حفظ كود المدرسة ──
  window.setSchoolCode = function(code) {
    localStorage.setItem('schoolCode', code);
  };

  window.getSchoolCode = getSchoolCode;

  console.log('[API Client] Initialized — School:', getSchoolCode());

})();
