/* api-client.js — بديل google.script.run */
(function() {
  'use strict';

  function getSchoolCode() {
    var p = new URLSearchParams(window.location.search);
    return p.get('school') || localStorage.getItem('schoolCode') || 'SCH001';
  }

  var API_URL = '/.netlify/functions/api';

  function callAPI(action, params) {
    var sc = getSchoolCode();
    var body = { action: action, schoolCode: sc };
    if (params) { Object.keys(params).forEach(function(k) { body[k] = params[k]; }); }
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).catch(function(e) {
      console.error('API [' + action + ']:', e); throw e;
    });
  }

  var F = {
    doLogin: function(p) { return callAPI('doLogin', { password: p }); },
    doUnifiedLogin: function(c) { return callAPI('doUnifiedLogin', { credential: c, schoolCode: getSchoolCode() }); },
    doUnifiedLogin: function(credential) { return callAPI('doUnifiedLogin', { credential: credential }); },
    doTeacherLogin: function(c) { return callAPI('doTeacherLogin', { code: c }); },
    getClasses: function() { return callAPI('getClasses'); },
    addClass: function(n) { return callAPI('addClass', { name: n }); },
    deleteClass: function(n) { return callAPI('deleteClass', { name: n }); },
    syncClassesNow: function() { return callAPI('syncClassesNow'); },
    getStudentsByClass: function(c) { return callAPI('getStudentsByClass', { className: c }); },
    addStudentsBatch: function(c, n, p, i) { return callAPI('addStudentsBatch', { className: c, names: n, phones: p, ids: i }); },
    updateStudent: function(c, on, nn, np, ni) { return callAPI('updateStudent', { className: c, oldName: on, newName: nn, newPhone: np, newId: ni }); },
    deleteStudent: function(c, s) { return callAPI('deleteStudent', { className: c, studentName: s }); },
    deleteStudentsByClass: function(c) { return callAPI('deleteStudentsByClass', { className: c }); },
    importStudentsBatch: function(p, m) { return callAPI('importStudentsBatch', { payload: p, mode: m }); },
    verifyParentById: function(id) { return callAPI('verifyParentById', { nationalId: id }); },
    getViolationTypes: function() { return callAPI('getViolationTypes'); },
    addViolationTypesBatch: function(t, m, s) { return callAPI('addViolationTypesBatch', { types: t, messages: m, severities: s }); },
    updateViolationType: function(ot, nt, nm, ns) { return callAPI('updateViolationType', { oldType: ot, newType: nt, newMessage: nm, newSeverity: ns }); },
    deleteViolationType: function(n) { return callAPI('deleteViolationType', { typeName: n }); },
    getClassViolationTypes: function() { return callAPI('getClassViolationTypes'); },
    addClassViolationTypesBatch: function(t, m, s) { return callAPI('addClassViolationTypesBatch', { types: t, messages: m, severities: s }); },
    updateClassViolationType: function(ot, nt, nm, ns) { return callAPI('updateClassViolationType', { oldType: ot, newType: nt, newMessage: nm, newSeverity: ns }); },
    deleteClassViolationType: function(n) { return callAPI('deleteClassViolationType', { typeName: n }); },
    getPositiveBehaviorTypes: function() { return callAPI('getPositiveBehaviorTypes'); },
    addPositiveBehaviorTypesBatch: function(t, m, s, st) { return callAPI('addPositiveBehaviorTypesBatch', { types: t, messages: m, scores: s, subTypes: st }); },
    updatePositiveBehaviorType: function(ot, nt, nm, ns, nst) { return callAPI('updatePositiveBehaviorType', { oldType: ot, newType: nt, newMessage: nm, newScore: ns, newSubType: nst }); },
    deletePositiveBehaviorType: function(n) { return callAPI('deletePositiveBehaviorType', { typeName: n }); },
    recordViolation: function(sd, vt, no, re, se, si, fi, ca, sc, su, at, ak, sbt, vp) {
      return callAPI('recordViolation', { studentsData: sd, violationType: vt, notes: no, recorder: re, severity: se, signature: si, fingerprint: fi, category: ca, score: sc, subject: su, actionType: at, actionTaken: ak, subType: sbt, visibleToParentOverride: vp });
    },
    recordPositiveBehavior: function(sd, bt, no, re, sc, st, sm) {
      return callAPI('recordPositiveBehavior', { studentsData: sd, behaviorType: bt, notes: no, recorder: re, score: sc, subType: st, sendMessage: sm });
    },
    logMessagesBatch: function(m, s) { return callAPI('logMessagesBatch', { messages: m, sender: s }); },
    getViolationsLog: function(fc, fd, ft) { return callAPI('getViolationsLog', { filterClass: fc, filterDate: fd, filterType: ft }); },
    getMessagesLog: function(fc, fd) { return callAPI('getMessagesLog', { filterClass: fc, filterDate: fd }); },
    getPositiveBehaviorsLog: function(fc, fd) { return callAPI('getPositiveBehaviorsLog', { filterClass: fc, filterDate: fd }); },
    updateViolationLog: function(d, s, ot, nt, nn) { return callAPI('updateViolationLog', { date: d, studentName: s, oldType: ot, newType: nt, newNotes: nn }); },
    deleteViolationLog: function(d, s, v) { return callAPI('deleteViolationLog', { date: d, studentName: s, violationType: v }); },
    addFollowUp: function(d, s, v, f, b) { return callAPI('addFollowUp', { date: d, studentName: s, violationType: v, followUpText: f, behaviorStatus: b }); },
    setVisibleToParent: function(d, s, v, vis) { return callAPI('setVisibleToParent', { date: d, studentName: s, violationType: v, visible: vis }); },
    referViolationToAdmin: function(s, v, c) { return callAPI('referViolationToAdmin', { studentName: s, violationType: v, className: c }); },
    updateActionTaken: function(d, s, v, at, ak) { return callAPI('updateActionTaken', { date: d, studentName: s, violationType: v, actionType: at, actionTaken: ak }); },
    adminApproveVisibility: function(d, s, v, vis) { return callAPI('adminApproveVisibility', { date: d, studentName: s, violationType: v, visible: vis }); },
    getTeachers: function() { return callAPI('getTeachers'); },
    addTeacher: function(n, s, c, k) { return callAPI('addTeacher', { name: n, subjects: s, classes: c, code: k }); },
    updateTeacher: function(on, n, s, c, k, a) { return callAPI('updateTeacher', { oldName: on, name: n, subjects: s, classes: c, code: k, active: a }); },
    deleteTeacher: function(n) { return callAPI('deleteTeacher', { name: n }); },
    deleteAllTeachers: function() { return callAPI('deleteAllTeachers'); },
    upsertTeacher: function(n, s, c, k) { return callAPI('upsertTeacher', { name: n, subjects: s, classes: c, code: k }); },
    getAdvancedStats: function(df) { return callAPI('getAdvancedStats', { dateFilter: df }); },
    getWeeklyReport: function() { return callAPI('getWeeklyReport'); },
    getMonthlyChartData: function() { return callAPI('getMonthlyChartData'); },
    getHeatmapData: function() { return callAPI('getHeatmapData'); },
    getRepeatedViolations: function(fc) { return callAPI('getRepeatedViolations', { filterClasses: fc }); },
    getRepeatedViolationsForAdmin: function() { return callAPI('getRepeatedViolationsForAdmin'); },
    getReferredViolations: function() { return callAPI('getReferredViolations'); },
    getMyViolations: function(df, tn) { return callAPI('getMyViolations', { dateFilter: df, teacherName: tn }); },
    getStudentProfile: function(sn, cn, vr) { return callAPI('getStudentProfile', { studentName: sn, className: cn, viewerRole: vr }); },
    saveReport: function(d) { return callAPI('saveReport', { data: d }); },
    getReports: function() { return callAPI('getReports'); },
    getReportByNum: function(n) { return callAPI('getReportByNum', { reportNum: n }); },
    updateReportStatus: function(n, s) { return callAPI('updateReportStatus', { reportNum: n, status: s }); },
    getReportsByStudent: function(sn, cn) { return callAPI('getReportsByStudent', { studentName: sn, className: cn }); },
    getFullReportData: function(df, dt) { return callAPI('getFullReportData', { dateFrom: df, dateTo: dt }); },
    getLastRegionName: function() { return callAPI('getLastRegionName'); },
    getCustomSettings:  function() { return callAPI('getCustomSettings'); },
    getTeacherSettings: function() { return callAPI('getTeacherSettings'); },
    getParentSettings:  function() { return callAPI('getParentSettings'); },
    saveCustomSettings: function(s) { return callAPI('saveCustomSettings', { settings: s }); },
    getSchoolCode: function() { return Promise.resolve({ code: getSchoolCode() }); },
    getTeacherUrl: function() {
      var sc = getSchoolCode();
      var base = window.location.origin;
      return Promise.resolve(base + '/teacher.html?school=' + sc);
    },
    getParentUrl: function() {
      var sc = getSchoolCode();
      var base = window.location.origin;
      return Promise.resolve(base + '/parent.html?school=' + sc);
    },
    getSpreadsheetUrl: function() { return Promise.resolve({ url: '#' }); },
    initializeSheets: function() { return callAPI('initializeSheets'); }
  };

  function makeRunner() {
    var _s = null, _f = null;
    var runner = {
      withSuccessHandler: function(fn) { _s = fn; return runner; },
      withFailureHandler: function(fn) { _f = fn; return runner; }
    };
    Object.keys(F).forEach(function(name) {
      runner[name] = function() {
        var args = Array.prototype.slice.call(arguments);
        F[name].apply(null, args)
          .then(function(r) { if (_s) _s(r); })
          .catch(function(e) { if (_f) _f(e); else console.error(e); });
      };
    });
    return runner;
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = new Proxy({}, {
    get: function(t, prop) {
      if (prop === 'withSuccessHandler' || prop === 'withFailureHandler') {
        return function(fn) { return makeRunner()[prop](fn); };
      }
      if (F[prop]) {
        return function() {
          var args = Array.prototype.slice.call(arguments);
          F[prop].apply(null, args).catch(function(e) { console.error(e); });
        };
      }
      return function() { console.warn('GAS: unknown: ' + prop); };
    }
  });

  window.GAS = F;
  window.setSchoolCode = function(c) { localStorage.setItem('schoolCode', c); };
  window.getSchoolCode = getSchoolCode;

  console.log('[API] Ready — School:', getSchoolCode());
})();
