/* Gym tracker — frontend. Plain JS, no build step. Talks only to /api.ashx (or the mock on localhost). */
(function () {
  'use strict';

  // ===================================================================== i18n
  var T = {
    tr: {
      tab_log: 'Antrenman', tab_history: 'Geçmiş', tab_stats: 'İstatistik', tab_export: 'Dışa aktar',
      title_log: 'Antrenman', title_history: 'Geçmiş', title_stats: 'İstatistik', title_export: 'Claude için dışa aktar',
      last_workout: 'Son antrenman: {name}, {when}', no_workouts: 'Henüz antrenman yok.',
      today: 'bugün', yesterday: 'dün', days_ago: '{n} gün önce', in_days: '{n} gün sonra',
      custom_workout: 'Özel antrenman', template_optional: 'Şablon (isteğe bağlı)', suggested: 'sıradaki',
      no_templates: 'Henüz şablon yok. Dışa aktar sekmesinin altındaki Ayarlar’dan ekleyebilirsin.',
      date: 'Tarih', body_weight: 'Kilo (kg)', start_workout: 'Antrenmanı başlat',
      started_at: '{time} başladı', last_time: 'Son', next_time: 'Hedef', comment: 'Yorum', next_time_ph: 'Bir dahaki sefere hedef',
      comment_ph: 'Nasıl geçti?', kg: 'kg', reps: 'tekrar', sec: 'sn', rest: 'dinlenme', form: 'form',
      add_set: '+ Set', set_note_ph: 'Bu set için not', remove_set: 'Seti sil', more: 'Daha fazla',
      form_broke: 'Form bozuldu', move_up: 'Yukarı taşı', move_down: 'Aşağı taşı', remove_ex: 'Hareketi çıkar',
      add_exercise: 'Hareket ekle', add_exercise_ph: 'Hareket adı', add: 'Ekle',
      kind_0: 'Ağırlık + tekrar', kind_1: 'Sadece tekrar', kind_2: 'Süre',
      session_comment: 'Antrenman yorumu', save_workout: 'Kaydet', discard: 'Antrenmanı sil',
      discard_q: 'Bu antrenman kaydedilmeden silinsin mi?', yes_discard: 'Evet, sil', cancel: 'Vazgeç',
      saved: 'Kaydedildi', saved_offline: 'Bağlantı yok — telefonda saklandı, bağlantı gelince gönderilecek.',
      not_synced: '{n} antrenman henüz gönderilmedi.', retry: 'Tekrar dene', synced: 'Bekleyen antrenmanlar gönderildi',
      save_as_template: 'Şablon olarak kaydet', template_name: 'Şablon adı', save: 'Kaydet',
      just_saved_custom: 'Özel antrenman kaydedildi. Şablon olarak saklamak ister misin?', dismiss: 'Kapat',
      rest_start: 'Dinlenmeyi başlat', rest_stop: 'Durdur', rest_label: 'Dinlenme',
      nothing_to_save: 'Kaydedilecek set yok. En az bir sete tekrar ya da süre gir.',
      bad_number: '“{v}” bir sayı değil.', editing: 'Düzenleniyor', back: '← Geri',
      history_empty: 'Henüz kayıtlı antrenman yok.', load_more: 'Daha fazla yükle', edit: 'Düzenle', delete: 'Sil',
      delete_q: 'Bu antrenman kalıcı olarak silinsin mi?', yes_delete: 'Evet, sil', deleted: 'Silindi',
      min: 'dk', duration: 'Süre', exercise_history: 'Hareket geçmişi', exhist_empty: 'Bu hareket henüz yapılmadı.',
      stats_totals: 'Toplamlar', this_week: 'Bu hafta', this_month: 'Bu ay', all_time: 'Toplam',
      per_week: 'Haftalık ortalama (son 4 hafta)', avg_duration: 'Ortalama süre',
      stats_bw: 'Kilo', latest: 'Son', change_30: '30 günlük değişim', stats_exercises: 'Hareketler',
      col_exercise: 'Hareket', col_sessions: 'Kez', col_weight: 'İlk → son', col_best: 'En iyi', col_last: 'Son',
      stats_empty: 'İstatistik için önce birkaç antrenman kaydet.',
      range: 'Aralık', since_last: 'Son dışa aktarımdan beri', last_one: 'Son antrenman', d7: '7 gün', d14: '14 gün', d30: '30 gün', custom: 'Özel',
      from: 'Başlangıç', to: 'Bitiş', question: 'Claude’a sorun / yorumun', question_ph: 'Örn. ilerlememe bakar mısın?',
      copy: 'Claude için kopyala', copied: 'Kopyalandı', copy_failed: 'Kopyalanamadı — metni seçip elle kopyala.',
      preview: 'Önizleme', no_export: 'Bu aralıkta antrenman yok.', last_export: 'Son dışa aktarım: {when}', never_exported: 'Daha önce dışa aktarılmadı.',
      backup: 'Yedeği indir (JSON)', settings: 'Ayarlar', devices: 'Cihazlar', this_device: 'bu cihaz', last_seen: 'son görülme {when}',
      remove: 'Kaldır', remove_device_q: 'Bu cihazın erişimi kaldırılsın mı?', remove_self_q: 'Bu cihazın kendisi. Kaldırırsan erişimin kapanır. Emin misin?',
      exercises: 'Hareketler', new_exercise: '+ Yeni hareket', name: 'Ad', kind: 'Tür', aliases: 'Diğer adlar (virgülle)', archived: 'Arşivde',
      templates: 'Şablonlar', new_template: '+ Yeni şablon', template_exercises: 'Hareketler', delete_template: 'Şablonu sil',
      delete_template_q: 'Şablon silinsin mi? Geçmiş antrenmanlar etkilenmez.', no_exercises_yet: 'Henüz hareket yok.',
      not_enrolled: 'Bu cihaz kayıtlı değil.', error: 'Hata: {msg}', offline: 'Bağlantı yok.', loading: 'Yükleniyor…',
      form_mark: '* = form bozuldu',
      ex_log_title: '# Antrenman günlüğü — {from} – {to} ({n} antrenman)', ex_duration: 'Süre: {n} dk', ex_bw: 'Kilo: {n} kg',
      ex_rest: 'dinlenme', ex_next: 'hedef', ex_comment: 'yorum', ex_session: 'Antrenman yorumu', ex_question: 'Sorum / yorumum:',
      mock_mode: 'Deneme modu: uydurma veriler, sunucu yok.',
      finish_first: 'Önce açık antrenmanı kaydet ya da sil.'
    },
    en: {
      tab_log: 'Log', tab_history: 'History', tab_stats: 'Stats', tab_export: 'Export',
      title_log: 'Workout', title_history: 'History', title_stats: 'Stats', title_export: 'Export for Claude',
      last_workout: 'Last workout: {name}, {when}', no_workouts: 'No workouts yet.',
      today: 'today', yesterday: 'yesterday', days_ago: '{n} days ago', in_days: 'in {n} days',
      custom_workout: 'Custom workout', template_optional: 'Template (optional)', suggested: 'next',
      no_templates: 'No templates yet. Add them under Settings at the bottom of the Export tab.',
      date: 'Date', body_weight: 'Body weight (kg)', start_workout: 'Start workout',
      started_at: 'started {time}', last_time: 'Last', next_time: 'Target', comment: 'Comment', next_time_ph: 'Target for next time',
      comment_ph: 'How did it go?', kg: 'kg', reps: 'reps', sec: 'sec', rest: 'rest', form: 'form',
      add_set: '+ Set', set_note_ph: 'Note for this set', remove_set: 'Remove set', more: 'More',
      form_broke: 'Form broke', move_up: 'Move up', move_down: 'Move down', remove_ex: 'Remove exercise',
      add_exercise: 'Add exercise', add_exercise_ph: 'Exercise name', add: 'Add',
      kind_0: 'Weight + reps', kind_1: 'Reps only', kind_2: 'Time',
      session_comment: 'Workout comment', save_workout: 'Save', discard: 'Discard workout',
      discard_q: 'Discard this workout without saving?', yes_discard: 'Yes, discard', cancel: 'Cancel',
      saved: 'Saved', saved_offline: 'No connection — kept on this phone and will be sent when the connection is back.',
      not_synced: '{n} workout(s) not synced yet.', retry: 'Retry', synced: 'Waiting workouts were sent',
      save_as_template: 'Save as template', template_name: 'Template name', save: 'Save',
      just_saved_custom: 'Custom workout saved. Keep it as a template?', dismiss: 'Dismiss',
      rest_start: 'Start rest', rest_stop: 'Stop', rest_label: 'Rest',
      nothing_to_save: 'Nothing to save. Enter reps or a duration for at least one set.',
      bad_number: '“{v}” is not a number.', editing: 'Editing', back: '← Back',
      history_empty: 'No workouts saved yet.', load_more: 'Load more', edit: 'Edit', delete: 'Delete',
      delete_q: 'Delete this workout for good?', yes_delete: 'Yes, delete', deleted: 'Deleted',
      min: 'min', duration: 'Duration', exercise_history: 'Exercise history', exhist_empty: 'Not done yet.',
      stats_totals: 'Totals', this_week: 'This week', this_month: 'This month', all_time: 'All time',
      per_week: 'Per week (last 4 weeks)', avg_duration: 'Average duration',
      stats_bw: 'Body weight', latest: 'Latest', change_30: 'Change over 30 days', stats_exercises: 'Exercises',
      col_exercise: 'Exercise', col_sessions: 'Times', col_weight: 'First → latest', col_best: 'Best', col_last: 'Last',
      stats_empty: 'Save a few workouts to see stats.',
      range: 'Range', since_last: 'Since last export', last_one: 'Last workout', d7: '7 days', d14: '14 days', d30: '30 days', custom: 'Custom',
      from: 'From', to: 'To', question: 'Question / comment for Claude', question_ph: 'e.g. How is my progress?',
      copy: 'Copy for Claude', copied: 'Copied', copy_failed: 'Could not copy — select the text and copy it by hand.',
      preview: 'Preview', no_export: 'No workouts in this range.', last_export: 'Last export: {when}', never_exported: 'Never exported.',
      backup: 'Download backup (JSON)', settings: 'Settings', devices: 'Devices', this_device: 'this device', last_seen: 'last seen {when}',
      remove: 'Remove', remove_device_q: 'Remove this device’s access?', remove_self_q: 'This is the device you are using. Removing it locks you out. Sure?',
      exercises: 'Exercises', new_exercise: '+ New exercise', name: 'Name', kind: 'Kind', aliases: 'Other names (comma-separated)', archived: 'Archived',
      templates: 'Templates', new_template: '+ New template', template_exercises: 'Exercises', delete_template: 'Delete template',
      delete_template_q: 'Delete this template? Past workouts are not affected.', no_exercises_yet: 'No exercises yet.',
      not_enrolled: 'This device is not enrolled.', error: 'Error: {msg}', offline: 'No connection.', loading: 'Loading…',
      form_mark: '* = form broke',
      ex_log_title: '# Workout log — {from} to {to} ({n} workouts)', ex_duration: 'Duration: {n} min', ex_bw: 'Body weight: {n} kg',
      ex_rest: 'rest', ex_next: 'next time', ex_comment: 'comment', ex_session: 'Session comment', ex_question: 'My question / comment:',
      mock_mode: 'Demo mode: made-up data, no server.',
      finish_first: 'Save or discard the open workout first.'
    }
  };

  function t(key, vars) {
    var s = (T[lang] && T[lang][key]) || T.en[key] || key;
    if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  // ===================================================================== small helpers
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage may be unavailable */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  var lang = (function () {
    var saved = store.get('gym.lang');
    if (saved === 'tr' || saved === 'en') return saved;
    return (navigator.language || '').toLowerCase().indexOf('tr') === 0 ? 'tr' : 'en';
  })();

  function $(sel, root) { return (root || document).querySelector(sel); }

  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      for (var k in props) {
        var v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v; // trusted constants only (icons)
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }

  var ICONS = {
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    arrowup: '<path d="M12 18V6M7 11l5-5 5 5"/>'
  };
  function icon(name) {
    return h('span', { 'aria-hidden': 'true', html: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>' });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr() { return dateStr(new Date()); }
  function parseDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseDate(s); d.setDate(d.getDate() + n); return dateStr(d); }
  function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
  function relDay(s) {
    var n = daysBetween(s, todayStr());
    if (n === 0) return t('today');
    if (n === 1) return t('yesterday');
    if (n < 0) return t('in_days', { n: -n });
    return t('days_ago', { n: n });
  }
  function niceDate(s) {
    try { return parseDate(s).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
    catch (e) { return s; }
  }
  function shortDate(s) {
    try { return parseDate(s).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return s; }
  }
  function weekday(s) {
    try { return parseDate(s).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', { weekday: 'short' }); } catch (e) { return ''; }
  }
  function relTime(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return relDay(dateStr(d)) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  // Numbers: accept "22,5" and "22.5"; show with the language's decimal mark.
  function parseNum(v) {
    if (v == null) return null;
    var s = String(v).trim().replace(',', '.');
    if (s === '') return null;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  function fmt(n) {
    if (n == null || n === '') return '';
    var s = String(Math.round(Number(n) * 100) / 100);
    return lang === 'tr' ? s.replace('.', ',') : s;
  }
  // Rest / duration: seconds or m:ss.
  function parseSecs(v) {
    if (v == null) return null;
    var s = String(v).trim();
    if (s === '') return null;
    var m = /^(\d+):(\d{1,2})$/.exec(s);
    if (m) return +m[1] * 60 + +m[2];
    var n = parseNum(s);
    return isNaN(n) ? NaN : Math.round(n);
  }
  function fmtSecs(n) { if (n == null || n === '') return ''; n = +n; return Math.floor(n / 60) + ':' + pad(n % 60); }

  function toast(msg, isError) {
    var el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el.className = 'toast'; }, isError ? 4500 : 2200);
  }

  // ===================================================================== API
  var MOCK = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var mockReady = null;
  function loadMock() {
    if (!mockReady) mockReady = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = '/assets/mock.js'; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    return mockReady;
  }

  function api(route, params, body) {
    var qs = '';
    if (params) for (var k in params) if (params[k] != null) qs += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    if (MOCK) return loadMock().then(function () { return window.GymMock.call(route, params || {}, body); });
    var opts = { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: {} };
    if (body) { opts.headers['Content-Type'] = 'application/json'; opts.headers['X-Gym'] = '1'; opts.body = JSON.stringify(body); }
    return fetch('/api.ashx?r=' + route + qs, opts).then(function (res) {
      if (res.status === 403) { var e = new Error(t('not_enrolled')); e.status = 403; throw e; }
      return res.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : {}; } catch (x) { /* not JSON */ }
        if (!res.ok) { var err = new Error((data && data.error) || ('HTTP ' + res.status)); err.status = res.status; throw err; }
        return data;
      });
    }, function () { var e = new Error(t('offline')); e.offline = true; throw e; });
  }

  function fail(e) { toast(e.offline ? t('offline') : t('error', { msg: e.message }), true); }

  // ===================================================================== state
  var S = {
    tab: 'log',
    start: null,          // data from r=start
    draft: store.get('gym.draft'),
    queue: store.get('gym.queue') || [],
    overlay: null,        // { type: 'exhist', id }
    history: null,        // { workouts, hasMore, open, confirm }
    justSaved: null,      // { exercises: [ids], templating }
    exportRange: store.get('gym.exportRange') || 'since',
    exportFrom: null, exportTo: null,
    settings: { editEx: null, editTpl: null, confirmDevice: null }
  };

  var saveDraftTimer = null;
  function saveDraft() {
    clearTimeout(saveDraftTimer);
    saveDraftTimer = setTimeout(function () { if (S.draft) store.set('gym.draft', S.draft); else store.del('gym.draft'); }, 250);
  }
  function saveDraftNow() { clearTimeout(saveDraftTimer); if (S.draft) store.set('gym.draft', S.draft); else store.del('gym.draft'); }

  function exercises() { return (S.start && S.start.exercises) || []; }
  function exerciseById(id) { return exercises().filter(function (e) { return e.id === id; })[0]; }
  function findExerciseByName(name) {
    var n = name.trim().toLocaleLowerCase();
    return exercises().filter(function (e) {
      if (e.name.toLocaleLowerCase() === n) return true;
      return (e.aliases || []).some(function (a) { return a.toLocaleLowerCase() === n; });
    })[0];
  }
  function templates() { return (S.start && S.start.templates) || []; }

  function refreshStart() {
    return api('start').then(function (d) { S.start = d; }).catch(function (e) { if (e.status === 403) showLocked(); else fail(e); });
  }

  // ===================================================================== shell
  function setTitle(key) { $('#view-title').textContent = t(key); }

  function renderChrome() {
    document.documentElement.lang = lang;
    Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (b) {
      b.textContent = t('tab_' + b.getAttribute('data-tab'));
      if (b.getAttribute('data-tab') === S.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
    renderBanner();
    renderRestBar();
  }

  function renderBanner() {
    var b = $('#banner');
    b.innerHTML = '';
    if (S.queue.length) {
      b.hidden = false;
      append(b, [h('span', { text: t('not_synced', { n: S.queue.length }) }),
        h('button', { class: 'btn small', type: 'button', onclick: function () { syncQueue(true); } }, t('retry'))]);
    } else if (MOCK) {
      b.hidden = false;
      append(b, h('span', { text: t('mock_mode') }));
    } else b.hidden = true;
  }

  function render() {
    renderChrome();
    var main = $('#main');
    main.innerHTML = '';
    if (S.overlay && S.overlay.type === 'exhist') return renderExerciseHistory(main);
    if (S.tab === 'log') return S.draft ? renderWorkout(main) : renderStart(main);
    if (S.tab === 'history') return renderHistory(main);
    if (S.tab === 'stats') return renderStats(main);
    if (S.tab === 'export') return renderExport(main);
  }

  function go(tab) {
    S.tab = tab; S.overlay = null;
    render();
    window.scrollTo(0, 0);
  }

  function showLocked() {
    $('#main').innerHTML = '';
    append($('#main'), h('p', { class: 'empty', text: t('not_enrolled') }));
  }

  // ===================================================================== sets: formatting and comparison
  function setNum(s, key) { var v = s[key]; return v == null || v === '' ? null : Number(v); }

  // "45 × 8, 8, 8*" style; groups consecutive sets with the same weight.
  function formatSets(sets, kind, opts) {
    opts = opts || {};
    var unit = opts.unit ? ' ' + t('kg') : '';
    var parts = [], cur = null;
    sets.forEach(function (s) {
      var mark = s.formBroke ? '*' : '';
      var note = opts.notes && s.note ? ' (' + s.note + ')' : '';
      if (kind === 2) { parts.push({ head: null, items: [fmtSecs(s.durationSec) + mark + note] }); cur = null; return; }
      var w = setNum(s, 'weightKg');
      var head = (kind === 0 || w != null) ? (w == null ? '—' : fmt(w) + unit) : null;
      var item = fmt(s.reps) + mark + note;
      if (cur && cur.head === head && !opts.splitEach) cur.items.push(item);
      else { cur = { head: head, items: [item] }; parts.push(cur); }
    });
    if (kind === 2) return parts.map(function (p) { return p.items[0]; }).join(', ');
    return parts.map(function (p) { return (p.head != null ? p.head + ' × ' : '× ') + p.items.join(', '); }).join(', ');
  }

  function beats(cur, prev, kind) {
    if (!prev) return false;
    if (kind === 2) { var d = parseSecs(cur.durationSec), pd = prev.durationSec; return d != null && !isNaN(d) && pd != null && d > pd; }
    var r = parseNum(cur.reps), pr = prev.reps == null ? null : Number(prev.reps);
    if (r == null || isNaN(r) || pr == null) return false;
    if (kind === 1) return r > pr;
    var w = parseNum(cur.weightKg), pw = prev.weightKg == null ? null : Number(prev.weightKg);
    if (w == null || isNaN(w) || pw == null) return false;
    return w > pw || (w === pw && r > pr);
  }

  // ===================================================================== Log: start screen
  function suggestedTemplateId() {
    var list = templates();
    if (!list.length) return null;
    var last = S.start && S.start.lastTemplateId;
    var i = list.map(function (x) { return x.id; }).indexOf(last);
    return list[(i + 1) % list.length].id;
  }

  function renderStart(main) {
    setTitle('title_log');
    var st = S.start;
    var chosen = S.startChoice === undefined ? null : S.startChoice;
    var suggested = suggestedTemplateId();

    if (S.justSaved) main.appendChild(renderJustSaved());

    var last = st && st.lastWorkout;
    main.appendChild(h('div', { class: 'section' },
      h('p', { class: 'lastline' }, last
        ? t('last_workout', { name: last.templateName || t('custom_workout'), when: relDay(last.date) })
        : t('no_workouts'))));

    var dateIn = h('input', { class: 'input', type: 'date', value: S.startDate || todayStr(), max: todayStr(),
      oninput: function () { S.startDate = dateIn.value; } });
    var bwIn = h('input', { class: 'input', inputmode: 'decimal', autocomplete: 'off',
      placeholder: st && st.lastBodyWeightKg != null ? fmt(st.lastBodyWeightKg) : '', value: S.startBw || '',
      oninput: function () { S.startBw = bwIn.value; } });
    main.appendChild(h('div', { class: 'section start-grid' },
      h('label', { class: 'field' }, h('span', { text: t('date') }), dateIn),
      h('label', { class: 'field' }, h('span', { text: t('body_weight') }), bwIn)));

    var tplSection = h('div', { class: 'section' }, h('h2', { text: t('template_optional') }));
    if (templates().length) {
      var chips = h('div', { class: 'chips', role: 'group', 'aria-label': t('template_optional') });
      templates().forEach(function (tp) {
        chips.appendChild(h('button', {
          class: 'chip', type: 'button', 'aria-pressed': chosen === tp.id ? 'true' : 'false',
          onclick: function () { S.startChoice = (chosen === tp.id ? null : tp.id); render(); }
        }, tp.name, tp.id === suggested ? h('span', { class: 'tag', text: t('suggested') }) : null));
      });
      tplSection.appendChild(chips);
    } else tplSection.appendChild(h('p', { class: 'muted small', text: t('no_templates') }));
    main.appendChild(tplSection);

    var startBtn = h('button', { class: 'btn primary block', type: 'button' },
      t('start_workout') + (chosen ? ' — ' + templates().filter(function (x) { return x.id === chosen; }).map(function (x) { return x.name; })[0] : ' — ' + t('custom_workout')));
    startBtn.addEventListener('click', function () {
      startBtn.disabled = true;
      var bw = parseNum(bwIn.value);
      if (isNaN(bw)) { toast(t('bad_number', { v: bwIn.value }), true); startBtn.disabled = false; return; }
      startWorkout(chosen, dateIn.value || todayStr(), bw).catch(function (e) { fail(e); startBtn.disabled = false; });
    });
    main.appendChild(h('div', { class: 'section' }, startBtn));
  }

  function renderJustSaved() {
    var js = S.justSaved;
    var box = h('div', { class: 'section notice stack' });
    if (!js.templating) {
      box.appendChild(h('p', { text: t('just_saved_custom') }));
      box.appendChild(h('div', { class: 'row' },
        h('button', { class: 'btn small primary', type: 'button', onclick: function () { js.templating = true; render(); } }, t('save_as_template')),
        h('button', { class: 'btn small ghost', type: 'button', onclick: function () { S.justSaved = null; render(); } }, t('dismiss'))));
    } else {
      box.appendChild(templateNameForm(js.exercises, function () { S.justSaved = null; render(); }));
    }
    return box;
  }

  function templateNameForm(exerciseIds, done) {
    var nameIn = h('input', { class: 'input', placeholder: t('template_name'), maxlength: '50' });
    var form = h('form', { class: 'row', onsubmit: function (ev) {
      ev.preventDefault();
      var name = nameIn.value.trim();
      if (!name) { nameIn.focus(); return; }
      api('template-save', { }, { name: name, exerciseIds: exerciseIds })
        .then(function () { toast(t('saved')); return refreshStart(); })
        .then(done).catch(fail);
    } }, h('div', { style: 'flex:1;min-width:160px' }, nameIn),
      h('button', { class: 'btn primary', type: 'submit' }, t('save')),
      h('button', { class: 'btn ghost', type: 'button', onclick: done }, t('cancel')));
    setTimeout(function () { nameIn.focus(); }, 0);
    return form;
  }

  // ===================================================================== Log: building a draft
  function blankSet() { return { weightKg: '', reps: '', durationSec: '', restSec: '', formBroke: false, note: '' }; }

  // Weight is carried over from last time (it rarely changes); reps/duration are typed, with last time as placeholder.
  function setsFromLast(last, kind) {
    var prev = (last && last.sets) || [];
    if (!prev.length) return [blankSet()];
    return prev.map(function (p) {
      var s = blankSet();
      if (kind === 0 && p.weightKg != null) s.weightKg = fmt(p.weightKg);
      if (kind === 1 && p.weightKg != null) s.weightKg = fmt(p.weightKg);
      return s;
    });
  }

  function draftExercise(exerciseId, name, kind, last) {
    return { exerciseId: exerciseId, name: name, kind: kind, last: last || null, comment: '', nextTarget: '', sets: setsFromLast(last, kind) };
  }

  function startWorkout(templateId, date, bw) {
    var base = {
      clientId: uuid(), id: null, date: date, templateId: templateId, templateName: null,
      startedAt: new Date().toISOString(), bodyWeightKg: bw == null ? '' : fmt(bw), comment: '', exercises: [], restStart: null, lastDone: null
    };
    if (!templateId) { S.draft = base; saveDraftNow(); render(); return Promise.resolve(); }
    return api('template-start', { id: templateId }).then(function (d) {
      var tp = templates().filter(function (x) { return x.id === templateId; })[0];
      base.templateName = tp ? tp.name : null;
      base.exercises = d.exercises.map(function (e) { return draftExercise(e.exerciseId, e.name, e.kind, e.last); });
      S.draft = base; saveDraftNow(); S.startChoice = undefined; S.startBw = ''; S.startDate = null;
      render();
    });
  }

  function editWorkout(id) {
    return api('workout', { id: id }).then(function (d) {
      var w = d.workout;
      var draft = {
        clientId: w.clientId || uuid(), id: w.id, date: w.date, templateId: w.templateId, templateName: w.templateName,
        startedAt: w.startedAt, bodyWeightKg: w.bodyWeightKg == null ? '' : fmt(w.bodyWeightKg), comment: w.comment || '',
        exercises: [], restStart: null, lastDone: null, editing: true
      };
      return Promise.all(w.exercises.map(function (e) {
        return api('exercise-last', { id: e.exerciseId, exclude: w.id }).then(function (r) {
          return {
            exerciseId: e.exerciseId, name: e.name, kind: e.kind, last: r.last, comment: e.comment || '', nextTarget: e.nextTarget || '',
            sets: e.sets.map(function (s) {
              return { weightKg: s.weightKg == null ? '' : fmt(s.weightKg), reps: s.reps == null ? '' : fmt(s.reps),
                durationSec: s.durationSec == null ? '' : fmtSecs(s.durationSec), restSec: s.restSec == null ? '' : fmtSecs(s.restSec),
                formBroke: !!s.formBroke, note: s.note || '' };
            })
          };
        });
      })).then(function (exs) {
        draft.exercises = exs;
        S.draft = draft; saveDraftNow(); S.tab = 'log'; S.overlay = null;
        render(); window.scrollTo(0, 0);
      });
    });
  }

  // ===================================================================== Log: active workout
  function renderWorkout(main) {
    var d = S.draft;
    setTitle('title_log');
    var started = d.startedAt ? new Date(d.startedAt) : null;
    main.appendChild(h('div', { class: 'wo-head' },
      h('h2', { text: (d.editing ? t('editing') + ': ' : '') + (d.templateName || t('custom_workout')) }),
      h('p', { class: 'muted small' }, niceDate(d.date) + (started && !d.editing ? ' · ' + t('started_at', { time: pad(started.getHours()) + ':' + pad(started.getMinutes()) }) : ''))));

    d.exercises.forEach(function (ex, i) { main.appendChild(renderExerciseBlock(ex, i)); });
    main.appendChild(renderAddExercise());

    var commentIn = h('textarea', { class: 'textarea', placeholder: t('comment_ph'), value: d.comment,
      oninput: function () { d.comment = commentIn.value; saveDraft(); } });
    var bwIn = h('input', { class: 'input', inputmode: 'decimal', value: d.bodyWeightKg,
      oninput: function () { d.bodyWeightKg = bwIn.value; saveDraft(); } });
    main.appendChild(h('div', { class: 'section stack' },
      h('label', { class: 'field' }, h('span', { text: t('session_comment') }), commentIn),
      h('label', { class: 'field' }, h('span', { text: t('body_weight') }), bwIn)));

    var saveBtn = h('button', { class: 'btn primary block', type: 'button' }, t('save_workout'));
    saveBtn.addEventListener('click', function () { saveBtn.disabled = true; saveWorkout().then(function () { saveBtn.disabled = false; }); });
    main.appendChild(h('div', { class: 'section' }, saveBtn));
    main.appendChild(renderDiscard());
  }

  function renderDiscard() {
    var wrap = h('div', { class: 'section' });
    if (!S.confirmDiscard) {
      wrap.appendChild(h('button', { class: 'btn danger ghost block', type: 'button', onclick: function () { S.confirmDiscard = true; render(); } }, t('discard')));
    } else {
      wrap.appendChild(h('div', { class: 'confirm' },
        h('span', { style: 'flex:1', text: t('discard_q') }),
        h('button', { class: 'btn small danger', type: 'button', onclick: function () { S.confirmDiscard = false; S.draft = null; saveDraftNow(); render(); } }, t('yes_discard')),
        h('button', { class: 'btn small', type: 'button', onclick: function () { S.confirmDiscard = false; render(); } }, t('cancel'))));
    }
    return wrap;
  }

  function renderExerciseBlock(ex, exIndex) {
    var d = S.draft;
    var block = h('section', { class: 'ex', 'aria-label': ex.name });
    var nameBtn = h('button', { class: 'linkbtn ex-name', type: 'button', onclick: function () { openExerciseHistory(ex.exerciseId); } }, ex.name);
    if (!ex.exerciseId) nameBtn.disabled = true;
    block.appendChild(h('div', { class: 'ex-head' }, nameBtn,
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': t('move_up'), disabled: exIndex === 0, onclick: function () { moveExercise(exIndex, -1); } }, icon('up')),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': t('move_down'), disabled: exIndex === d.exercises.length - 1, onclick: function () { moveExercise(exIndex, 1); } }, icon('down')),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': t('remove_ex'), onclick: function () { d.exercises.splice(exIndex, 1); saveDraft(); render(); } }, icon('x'))));

    var last = ex.last;
    if (last && last.nextTarget) block.appendChild(h('p', { class: 'target' }, h('strong', { text: t('next_time') + ': ' }), last.nextTarget));
    if (last && last.sets && last.sets.length) {
      block.appendChild(h('p', { class: 'last' }, t('last_time') + ' · ' + niceDate(last.date) + ' — ' + formatSets(last.sets, ex.kind, { notes: false }) +
        (last.comment ? ' — “' + last.comment + '”' : '')));
    }

    var sets = h('div', { class: 'sets' });
    var k = ex.kind;
    var kc = k === 0 ? '' : ' k' + k;
    sets.appendChild(h('div', { class: 'set-head' + kc, 'aria-hidden': 'true' },
      h('span', { text: '#' }),
      k === 0 ? h('span', { text: t('kg') }) : null,
      h('span', { text: k === 2 ? t('sec') : t('reps') }),
      h('span', { text: t('rest') }), h('span', { text: t('form') }), h('span', { text: '' })));
    ex.sets.forEach(function (s, si) { renderSetRow(sets, ex, exIndex, s, si); });
    block.appendChild(sets);

    var commentIn = h('textarea', { class: 'textarea', rows: '2', placeholder: t('comment_ph'), value: ex.comment, 'aria-label': t('comment'),
      oninput: function () { ex.comment = commentIn.value; saveDraft(); } });
    var nextIn = h('input', { class: 'input', placeholder: t('next_time_ph'), value: ex.nextTarget, maxlength: '200', 'aria-label': t('next_time'),
      oninput: function () { ex.nextTarget = nextIn.value; saveDraft(); } });
    block.appendChild(h('div', { class: 'ex-foot' },
      h('div', null, h('button', { class: 'btn small', type: 'button', onclick: function () { addSet(ex); } }, t('add_set'))),
      commentIn, nextIn));
    return block;
  }

  function placeholderFor(ex, si, key) {
    var prev = ex.last && ex.last.sets;
    if (!prev || !prev.length) return '';
    var p = prev[Math.min(si, prev.length - 1)];
    if (key === 'durationSec') return p.durationSec == null ? '' : fmtSecs(p.durationSec);
    return p[key] == null ? '' : fmt(p[key]);
  }

  function renderSetRow(container, ex, exIndex, s, si) {
    var k = ex.kind;
    var prev = ex.last && ex.last.sets ? ex.last.sets[si] : null;
    var row = h('div', { class: 'set' + (k === 0 ? '' : ' k' + k) });
    var upMark = h('span', { class: 'up', hidden: !beats(s, prev, k), title: '↑' }, icon('arrowup'));

    function onValue(key, input) {
      return function () {
        s[key] = input.value;
        upMark.hidden = !beats(s, prev, k);
        if (key === 'reps' || key === 'durationSec') {
          if (S.draft.restStart && !s.restSec && input.value !== '') { stopRest({ exIndex: exIndex, si: si }); }
          if (input.value !== '') S.draft.lastDone = { exIndex: exIndex, si: si };
        }
        saveDraft();
      };
    }

    row.appendChild(h('span', { class: 'idx', text: String(si + 1) }));
    if (k === 0) {
      var wIn = h('input', { class: 'input', inputmode: 'decimal', autocomplete: 'off', value: s.weightKg, placeholder: placeholderFor(ex, si, 'weightKg'), 'aria-label': t('kg') + ' ' + (si + 1) });
      wIn.addEventListener('input', onValue('weightKg', wIn));
      row.appendChild(wIn);
    }
    var key = k === 2 ? 'durationSec' : 'reps';
    var mainIn = h('input', { class: 'input', inputmode: k === 2 ? 'numeric' : 'decimal', autocomplete: 'off', value: s[key], placeholder: placeholderFor(ex, si, key),
      'aria-label': (k === 2 ? t('sec') : t('reps')) + ' ' + (si + 1) });
    mainIn.addEventListener('input', onValue(key, mainIn));
    row.appendChild(h('div', { class: 'cell' }, mainIn, upMark));

    var restIn = h('input', { class: 'input', inputmode: 'numeric', autocomplete: 'off', value: s.restSec, placeholder: 'm:ss', 'aria-label': t('rest') + ' ' + (si + 1),
      'data-rest': exIndex + ':' + si });
    restIn.addEventListener('input', function () { s.restSec = restIn.value; saveDraft(); });
    row.appendChild(restIn);

    var formBtn = h('button', { class: 'iconbtn', type: 'button', 'aria-pressed': s.formBroke ? 'true' : 'false', 'aria-label': t('form_broke'), title: t('form_broke') }, icon('warn'));
    formBtn.addEventListener('click', function () { s.formBroke = !s.formBroke; formBtn.setAttribute('aria-pressed', s.formBroke ? 'true' : 'false'); saveDraft(); });
    row.appendChild(formBtn);

    var moreBtn = h('button', { class: 'iconbtn', type: 'button', 'aria-label': t('more'), 'aria-expanded': s._open ? 'true' : 'false' }, icon('more'));
    moreBtn.addEventListener('click', function () { s._open = !s._open; render(); });
    row.appendChild(moreBtn);
    container.appendChild(row);

    if (s._open || s.note) {
      var noteIn = h('input', { class: 'input', value: s.note, placeholder: t('set_note_ph'), maxlength: '200', 'aria-label': t('set_note_ph') });
      noteIn.addEventListener('input', function () { s.note = noteIn.value; saveDraft(); });
      container.appendChild(h('div', { class: 'set-extra' }, h('span'), noteIn,
        h('button', { class: 'iconbtn', type: 'button', 'aria-label': t('remove_set'), onclick: function () { ex.sets.splice(si, 1); saveDraft(); render(); } }, icon('x'))));
    }
  }

  function addSet(ex) {
    var prev = ex.sets[ex.sets.length - 1];
    var s = blankSet();
    if (prev) { s.weightKg = prev.weightKg; s.reps = prev.reps; s.durationSec = prev.durationSec; }
    ex.sets.push(s);
    saveDraft(); render();
  }

  function moveExercise(i, dir) {
    var list = S.draft.exercises, j = i + dir;
    if (j < 0 || j >= list.length) return;
    var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    saveDraft(); render();
  }

  function renderAddExercise() {
    var listId = 'ex-names';
    var dl = h('datalist', { id: listId });
    exercises().filter(function (e) { return !e.archived; }).forEach(function (e) {
      dl.appendChild(h('option', { value: e.name }));
      (e.aliases || []).forEach(function (a) { dl.appendChild(h('option', { value: a }, e.name)); });
    });
    var nameIn = h('input', { class: 'input', list: listId, placeholder: t('add_exercise_ph'), maxlength: '100', 'aria-label': t('add_exercise') });
    var kindSel = h('select', { class: 'select', 'aria-label': t('kind') },
      [0, 1, 2].map(function (k) { return h('option', { value: String(k) }, t('kind_' + k)); }));
    var form = h('form', { class: 'section stack', onsubmit: function (ev) {
      ev.preventDefault();
      var name = nameIn.value.trim();
      if (!name) { nameIn.focus(); return; }
      var known = findExerciseByName(name);
      if (known) {
        api('exercise-last', { id: known.id, exclude: S.draft.id || 0 }).then(function (r) {
          S.draft.exercises.push(draftExercise(known.id, known.name, known.kind, r.last)); saveDraft(); render();
        }).catch(function () {
          S.draft.exercises.push(draftExercise(known.id, known.name, known.kind, null)); saveDraft(); render();
        });
      } else {
        S.draft.exercises.push(draftExercise(null, name, +kindSel.value, null)); saveDraft(); render();
      }
    } },
      h('h2', { text: t('add_exercise') }), dl,
      h('div', { class: 'addline' }, nameIn, h('button', { class: 'btn', type: 'submit' }, t('add'))),
      h('label', { class: 'field' }, h('span', { text: t('kind') + ' (' + t('new_exercise').replace('+ ', '').toLocaleLowerCase() + ')' }), kindSel));
    return form;
  }

  // ===================================================================== Log: saving
  function buildPayload() {
    var d = S.draft, problem = null;
    function num(v, parser) {
      var n = (parser || parseNum)(v);
      if (n != null && isNaN(n) && !problem) problem = t('bad_number', { v: v });
      return n == null || isNaN(n) ? null : n;
    }
    var exs = [];
    d.exercises.forEach(function (ex) {
      var sets = [];
      ex.sets.forEach(function (s) {
        var reps = ex.kind === 2 ? null : num(s.reps);
        var dur = ex.kind === 2 ? num(s.durationSec, parseSecs) : null;
        if (reps == null && dur == null) return; // empty row = not done
        sets.push({ weightKg: ex.kind === 2 ? null : num(s.weightKg), reps: reps, durationSec: dur, restSec: num(s.restSec, parseSecs),
          formBroke: !!s.formBroke, note: (s.note || '').trim() || null });
      });
      var comment = (ex.comment || '').trim(), next = (ex.nextTarget || '').trim();
      if (!sets.length && !comment && !next) return; // skipped exercise
      exs.push({ exerciseId: ex.exerciseId, name: ex.name, kind: ex.kind, comment: comment || null, nextTarget: next || null, sets: sets });
    });
    var payload = {
      id: d.id, clientId: d.clientId, date: d.date, templateId: d.templateId, comment: (d.comment || '').trim() || null,
      bodyWeightKg: num(d.bodyWeightKg), startedAt: d.startedAt, endedAt: d.editing ? null : new Date().toISOString(), exercises: exs
    };
    if (problem) return { error: problem };
    if (!exs.some(function (e) { return e.sets.length; })) return { error: t('nothing_to_save') };
    return { payload: payload };
  }

  function saveWorkout() {
    var b = buildPayload();
    if (b.error) { toast(b.error, true); return Promise.resolve(); }
    var p = b.payload;
    var wasCustom = !p.templateId && !S.draft.editing;
    return api('workout-save', null, p).then(function () {
      afterSave(wasCustom, p);
      toast(t('saved'));
      return refreshStart().then(render);
    }).catch(function (e) {
      if (e.offline) {
        S.queue.push(p); store.set('gym.queue', S.queue);
        afterSave(false, p);
        toast(t('saved_offline'));
        render();
      } else fail(e);
    });
  }

  function afterSave(wasCustom, p) {
    S.justSaved = wasCustom ? { exercises: null, names: p.exercises.map(function (e) { return e.name; }), templating: false } : null;
    S.draft = null; S.confirmDiscard = false; saveDraftNow();
    S.history = null;
  }

  // The just-saved custom workout's exercises become the template; new names were created by the save, so look them up.
  var _templateNameForm = templateNameForm;
  templateNameForm = function (exerciseIds, done) {
    if (exerciseIds) return _templateNameForm(exerciseIds, done);
    var names = (S.justSaved && S.justSaved.names) || [];
    var ids = names.map(function (n) { var e = findExerciseByName(n); return e ? e.id : null; }).filter(function (x) { return x; });
    return _templateNameForm(ids, done);
  };

  var syncing = false;
  function syncQueue(manual) {
    if (syncing || !S.queue.length) return;
    syncing = true;
    var next = function () {
      if (!S.queue.length) { syncing = false; toast(t('synced')); refreshStart().then(render); return; }
      api('workout-save', null, S.queue[0]).then(function () {
        S.queue.shift(); store.set('gym.queue', S.queue); renderBanner(); next();
      }).catch(function (e) {
        syncing = false;
        if (!e.offline) { // the server refused it; keep it but tell the user
          fail(e);
        } else if (manual) toast(t('offline'), true);
      });
    };
    next();
  }

  // ===================================================================== rest stopwatch
  var restTimer = null;
  function renderRestBar() {
    var bar = $('#restbar');
    var active = S.tab === 'log' && S.draft && !S.overlay;
    if (!active) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.innerHTML = '';
    var running = !!S.draft.restStart;
    if (running) {
      var secs = Math.max(0, Math.floor((Date.now() - S.draft.restStart) / 1000));
      append(bar, [h('span', { class: 'label', text: t('rest_label') }), h('span', { class: 'time', id: 'rest-time', text: fmtSecs(secs) }),
        h('button', { class: 'btn small primary', type: 'button', onclick: function () { stopRest(null); } }, t('rest_stop'))]);
    } else {
      append(bar, [h('span', { class: 'label', text: t('rest_label') }), h('span', { class: 'time muted', text: '0:00' }),
        h('button', { class: 'btn small', type: 'button', onclick: startRest }, t('rest_start'))]);
    }
    clearInterval(restTimer);
    if (running) restTimer = setInterval(function () {
      var el = $('#rest-time');
      if (!el || !S.draft || !S.draft.restStart) { clearInterval(restTimer); return; }
      el.textContent = fmtSecs(Math.max(0, Math.floor((Date.now() - S.draft.restStart) / 1000)));
    }, 500);
  }

  function startRest() { if (!S.draft) return; S.draft.restStart = Date.now(); saveDraftNow(); renderRestBar(); }

  // Writes the elapsed time into the next set's rest box (or the given set), if that box is empty.
  function stopRest(target) {
    var d = S.draft;
    if (!d || !d.restStart) return;
    var secs = Math.max(1, Math.round((Date.now() - d.restStart) / 1000));
    d.restStart = null;
    var tgt = target || nextSetAfter(d.lastDone);
    if (tgt) {
      var s = d.exercises[tgt.exIndex] && d.exercises[tgt.exIndex].sets[tgt.si];
      if (s && !s.restSec) {
        s.restSec = fmtSecs(secs);
        var input = document.querySelector('[data-rest="' + tgt.exIndex + ':' + tgt.si + '"]');
        if (input) input.value = s.restSec;
      }
    }
    saveDraftNow(); renderRestBar();
  }

  function nextSetAfter(pos) {
    var exs = S.draft.exercises;
    if (!pos) return exs.length && exs[0].sets.length ? { exIndex: 0, si: 0 } : null;
    var ex = exs[pos.exIndex];
    if (ex && pos.si + 1 < ex.sets.length) return { exIndex: pos.exIndex, si: pos.si + 1 };
    for (var i = pos.exIndex + 1; i < exs.length; i++) if (exs[i].sets.length) return { exIndex: i, si: 0 };
    return null;
  }

  // ===================================================================== exercise history
  function openExerciseHistory(id) {
    if (!id) return;
    S.overlay = { type: 'exhist', id: id, entries: null, hasMore: false, from: S.tab };
    render(); window.scrollTo(0, 0);
    loadExerciseHistory(0);
  }

  function loadExerciseHistory(offset) {
    var o = S.overlay;
    api('exercise-history', { id: o.id, offset: offset, limit: 20 }).then(function (d) {
      if (S.overlay !== o) return;
      o.name = d.name;
      o.entries = (o.entries || []).concat(d.entries);
      o.hasMore = d.hasMore;
      render();
    }).catch(fail);
  }

  function renderExerciseHistory(main) {
    var o = S.overlay;
    var ex = exerciseById(o.id);
    setTitle('exercise_history');
    main.appendChild(h('div', { class: 'section' },
      h('button', { class: 'btn small ghost', type: 'button', onclick: function () { S.overlay = null; render(); } }, t('back')),
      h('h2', { style: 'margin-top:10px;font-size:1.25rem', text: o.name || (ex && ex.name) || '' })));
    if (!o.entries) { main.appendChild(h('p', { class: 'empty', text: t('loading') })); return; }
    if (!o.entries.length) { main.appendChild(h('p', { class: 'empty', text: t('exhist_empty') })); return; }
    var kind = ex ? ex.kind : 0;
    var list = h('div', { class: 'list' });
    o.entries.forEach(function (e) {
      list.appendChild(h('div', { class: 'item' },
        h('div', { class: 'item-head' }, h('span', { class: 'item-title', text: niceDate(e.date) }), h('span', { class: 'muted small', text: e.templateName || t('custom_workout') })),
        h('div', { class: 'exline', text: formatSets(e.sets, kind, { notes: true }) }),
        e.comment ? h('div', { class: 'note', text: '“' + e.comment + '”' }) : null,
        e.nextTarget ? h('div', { class: 'note' }, h('strong', { text: t('next_time') + ': ' }), e.nextTarget) : null));
    });
    main.appendChild(list);
    if (o.hasMore) main.appendChild(h('div', { class: 'section' },
      h('button', { class: 'btn block', type: 'button', onclick: function () { loadExerciseHistory(o.entries.length); } }, t('load_more'))));
  }

  // ===================================================================== History
  function renderHistory(main) {
    setTitle('title_history');
    if (!S.history) {
      S.history = { workouts: null, hasMore: false, open: null, confirm: null, templating: null };
      loadHistory(0);
    }
    var H = S.history;
    if (!H.workouts) { main.appendChild(h('p', { class: 'empty', text: t('loading') })); return; }
    if (!H.workouts.length) { main.appendChild(h('p', { class: 'empty', text: t('history_empty') })); return; }
    var list = h('div', { class: 'list' });
    H.workouts.forEach(function (w) { list.appendChild(renderHistoryItem(w)); });
    main.appendChild(list);
    if (H.hasMore) main.appendChild(h('div', { class: 'section' },
      h('button', { class: 'btn block', type: 'button', onclick: function () { loadHistory(H.workouts.length); } }, t('load_more'))));
  }

  function loadHistory(offset) {
    var H = S.history;
    api('workouts', { offset: offset, limit: 20 }).then(function (d) {
      if (S.history !== H) return;
      H.workouts = (offset ? H.workouts : []).concat(d.workouts);
      H.hasMore = d.hasMore;
      if (S.tab === 'history') render();
    }).catch(function (e) { H.workouts = H.workouts || []; fail(e); if (S.tab === 'history') render(); });
  }

  function renderHistoryItem(w) {
    var H = S.history;
    var open = H.open === w.id;
    var meta = [w.templateName || t('custom_workout')];
    if (w.durationMin) meta.push(w.durationMin + ' ' + t('min'));
    if (w.bodyWeightKg != null) meta.push(fmt(w.bodyWeightKg) + ' kg');
    var item = h('div', { class: 'item' });
    var toggle = h('button', { class: 'item-toggle', type: 'button', 'aria-expanded': open ? 'true' : 'false',
      onclick: function () { H.open = open ? null : w.id; H.confirm = null; H.templating = null; render(); } },
      h('div', { class: 'item-head' }, h('span', { class: 'item-title', text: niceDate(w.date) }), h('span', { class: 'muted small', text: meta.join(' · ') })),
      w.exercises.map(function (e) {
        return h('div', { class: 'exline' }, h('span', { class: 'n', text: e.name }), e.sets.length ? ' ' + formatSets(e.sets, e.kind, { notes: open }) : '');
      }));
    item.appendChild(toggle);
    if (open) {
      w.exercises.forEach(function (e) {
        if (e.comment) item.appendChild(h('div', { class: 'note' }, h('strong', { text: e.name + ': ' }), e.comment));
        if (e.nextTarget) item.appendChild(h('div', { class: 'note' }, h('strong', { text: t('next_time') + ' (' + e.name + '): ' }), e.nextTarget));
      });
      if (w.comment) item.appendChild(h('div', { class: 'note' }, h('strong', { text: t('session_comment') + ': ' }), w.comment));
      if (H.confirm === w.id) {
        item.appendChild(h('div', { class: 'confirm', style: 'margin-top:10px' }, h('span', { style: 'flex:1', text: t('delete_q') }),
          h('button', { class: 'btn small danger', type: 'button', onclick: function () {
            api('workout-delete', null, { id: w.id }).then(function () {
              H.workouts = H.workouts.filter(function (x) { return x.id !== w.id; }); H.open = null; H.confirm = null;
              toast(t('deleted')); refreshStart(); render();
            }).catch(fail);
          } }, t('yes_delete')),
          h('button', { class: 'btn small', type: 'button', onclick: function () { H.confirm = null; render(); } }, t('cancel'))));
      } else if (H.templating === w.id) {
        item.appendChild(h('div', { style: 'margin-top:10px' }, _templateNameForm(w.exercises.map(function (e) { return e.exerciseId; }), function () { H.templating = null; render(); })));
      } else {
        item.appendChild(h('div', { class: 'actions' },
          h('button', { class: 'btn small', type: 'button', onclick: function () {
            if (S.draft) { toast(t('finish_first'), true); return; }
            editWorkout(w.id).catch(fail);
          } }, t('edit')),
          !w.templateId ? h('button', { class: 'btn small', type: 'button', onclick: function () { H.templating = w.id; render(); } }, t('save_as_template')) : null,
          h('button', { class: 'btn small danger', type: 'button', onclick: function () { H.confirm = w.id; render(); } }, t('delete'))));
      }
    }
    return item;
  }

  // ===================================================================== Stats
  function renderStats(main) {
    setTitle('title_stats');
    if (!S.stats || S.stats.lang !== lang) { S.stats = { data: null, lang: lang }; api('stats', { today: todayStr() }).then(function (d) { S.stats.data = d; if (S.tab === 'stats') render(); }).catch(fail); }
    var d = S.stats.data;
    if (!d) { main.appendChild(h('p', { class: 'empty', text: t('loading') })); return; }
    if (!d.totals.allTime) { main.appendChild(h('p', { class: 'empty', text: t('stats_empty') })); return; }
    var tt = d.totals;
    main.appendChild(h('div', { class: 'section' }, h('h2', { text: t('stats_totals') }),
      h('dl', { class: 'facts' },
        h('dt', { text: t('this_week') }), h('dd', { text: String(tt.thisWeek) }),
        h('dt', { text: t('this_month') }), h('dd', { text: String(tt.thisMonth) }),
        h('dt', { text: t('all_time') }), h('dd', { text: String(tt.allTime) }),
        h('dt', { text: t('per_week') }), h('dd', { text: fmt(tt.perWeekLast4) }),
        h('dt', { text: t('avg_duration') }), h('dd', { text: tt.avgDurationMin == null ? '—' : tt.avgDurationMin + ' ' + t('min') }))));
    var bw = d.bodyWeight || {};
    if (bw.latestKg != null) {
      var ch = bw.change30Kg;
      main.appendChild(h('div', { class: 'section' }, h('h2', { text: t('stats_bw') }),
        h('dl', { class: 'facts' },
          h('dt', { text: t('latest') + ' (' + niceDate(bw.latestDate) + ')' }), h('dd', { text: fmt(bw.latestKg) + ' kg' }),
          h('dt', { text: t('change_30') }), h('dd', { text: ch == null ? '—' : (ch > 0 ? '+' : '') + fmt(ch) + ' kg' }))));
    }
    var rows = d.exercises.map(function (e) {
      var b = e.best || {}, best;
      if (e.kind === 2) best = b.durationSec != null ? fmtSecs(b.durationSec) : '—';
      else if (b.weightKg != null) best = fmt(b.weightKg) + ' × ' + fmt(b.reps);
      else best = b.reps != null ? '× ' + fmt(b.reps) : '—';
      var wt = e.firstWeightKg != null ? fmt(e.firstWeightKg) + ' → ' + fmt(e.latestWeightKg) : '—';
      return h('tr', null,
        h('td', null, h('button', { class: 'linkbtn', type: 'button', onclick: function () { openExerciseHistory(e.exerciseId); } }, e.name)),
        h('td', { class: 'num', text: String(e.sessions) }), h('td', { class: 'num', text: wt }), h('td', { class: 'num', text: best }),
        h('td', { class: 'num', text: shortDate(e.lastDate) }));
    });
    main.appendChild(h('div', { class: 'section' }, h('h2', { text: t('stats_exercises') }),
      h('div', { class: 'table-wrap' }, h('table', { class: 'stats' },
        h('thead', null, h('tr', null, ['col_exercise', 'col_sessions', 'col_weight', 'col_best', 'col_last'].map(function (k) { return h('th', { text: t(k) }); }))),
        h('tbody', null, rows)))));
  }

  // ===================================================================== Export
  function exportParams() {
    var r = S.exportRange, today = todayStr();
    if (r === 'since') return { since: 'last' };
    if (r === 'last') { var lw = S.start && S.start.lastWorkout; return lw ? { from: lw.date, to: lw.date } : { from: today, to: today }; }
    if (r === 'custom') return { from: S.exportFrom || addDays(today, -13), to: S.exportTo || today };
    var n = { d7: 7, d14: 14, d30: 30 }[r] || 7;
    return { from: addDays(today, -(n - 1)), to: today };
  }

  function buildExportText(data, question) {
    var ws = data.workouts.slice();
    if (S.exportRange === 'last' && ws.length > 1) ws = ws.slice(0, 1);
    if (!ws.length) return '';
    var dates = ws.map(function (w) { return w.date; }).sort();
    var out = [t('ex_log_title', { from: dates[0], to: dates[dates.length - 1], n: ws.length }), ''];
    var anyForm = false;
    ws.forEach(function (w) {
      out.push('## ' + w.date + ' (' + weekday(w.date) + ') — ' + (w.templateName || t('custom_workout')));
      var meta = [];
      if (w.durationMin) meta.push(t('ex_duration', { n: w.durationMin }));
      if (w.bodyWeightKg != null) meta.push(t('ex_bw', { n: fmt(w.bodyWeightKg) }));
      if (meta.length) out.push(meta.join(' · '));
      w.exercises.forEach(function (e) {
        if (e.sets.some(function (s) { return s.formBroke; })) anyForm = true;
        var rests = e.sets.filter(function (s) { return s.restSec != null; }).map(function (s) { return fmtSecs(s.restSec); });
        var line = '- ' + e.name + ': ' + (e.sets.length ? formatSets(e.sets, e.kind, { notes: true, unit: true }) : '—');
        if (rests.length) line += ' (' + t('ex_rest') + ' ' + rests.join(', ') + ')';
        out.push(line);
        if (e.comment) out.push('  ' + t('ex_comment') + ': ' + e.comment);
        if (e.nextTarget) out.push('  ' + t('ex_next') + ': ' + e.nextTarget);
      });
      if (w.comment) out.push(t('ex_session') + ': ' + w.comment);
      out.push('');
    });
    if (anyForm) out.push('(' + t('form_mark') + ')', '');
    if (question && question.trim()) out.push('---', t('ex_question'), question.trim());
    return out.join('\n').trim() + '\n';
  }

  function renderExport(main) {
    setTitle('title_export');
    var params = exportParams();
    var key = JSON.stringify(params);
    if (!S.exp || S.exp.key !== key) {
      S.exp = { key: key, data: null };
      api('export', params).then(function (d) { if (S.exp && S.exp.key === key) { S.exp.data = d; if (S.tab === 'export') render(); } }).catch(fail);
    }

    var chips = h('div', { class: 'chips' });
    [['since', 'since_last'], ['last', 'last_one'], ['d7', 'd7'], ['d14', 'd14'], ['d30', 'd30'], ['custom', 'custom']].forEach(function (c) {
      chips.appendChild(h('button', { class: 'chip', type: 'button', 'aria-pressed': S.exportRange === c[0] ? 'true' : 'false',
        onclick: function () { S.exportRange = c[0]; store.set('gym.exportRange', c[0]); render(); } }, t(c[1])));
    });
    var rangeSec = h('div', { class: 'section' }, h('h2', { text: t('range') }), chips);
    if (S.exportRange === 'custom') {
      var f = h('input', { class: 'input', type: 'date', value: params.from, onchange: function () { S.exportFrom = f.value; render(); } });
      var to = h('input', { class: 'input', type: 'date', value: params.to, onchange: function () { S.exportTo = to.value; render(); } });
      rangeSec.appendChild(h('div', { class: 'start-grid', style: 'margin-top:10px' },
        h('label', { class: 'field' }, h('span', { text: t('from') }), f), h('label', { class: 'field' }, h('span', { text: t('to') }), to)));
    }
    if (S.exp.data) rangeSec.appendChild(h('p', { class: 'muted small', style: 'margin-top:8px' },
      S.exp.data.lastExportAt ? t('last_export', { when: relTime(S.exp.data.lastExportAt) }) : t('never_exported')));
    main.appendChild(rangeSec);

    var q = h('textarea', { class: 'textarea', placeholder: t('question_ph'), value: store.get('gym.question') || '' });
    var pre = h('pre', { class: 'preview', tabindex: '0' });
    function update() {
      store.set('gym.question', q.value);
      pre.textContent = S.exp.data ? (buildExportText(S.exp.data, q.value) || t('no_export')) : t('loading');
    }
    q.addEventListener('input', update);
    update();
    main.appendChild(h('div', { class: 'section' }, h('label', { class: 'field' }, h('span', { text: t('question') }), q)));

    var copyBtn = h('button', { class: 'btn primary block', type: 'button' }, t('copy'));
    copyBtn.addEventListener('click', function () {
      var text = S.exp.data ? buildExportText(S.exp.data, q.value) : '';
      if (!text) { toast(t('no_export'), true); return; }
      copyText(text, pre).then(function (ok) {
        if (!ok) { toast(t('copy_failed'), true); return; }
        copyBtn.textContent = t('copied');
        setTimeout(function () { copyBtn.textContent = t('copy'); }, 2000);
        api('export-mark', null, {}).then(function (r) { if (S.exp && S.exp.data) S.exp.data.lastExportAt = r.lastExportAt; }).catch(function () { });
      });
    });
    main.appendChild(h('div', { class: 'section stack' }, copyBtn, h('h2', { text: t('preview') }), pre,
      h('p', null, h('a', { class: 'linkbtn', href: MOCK ? '#' : '/api.ashx?r=backup', onclick: MOCK ? function (ev) { ev.preventDefault(); mockBackup(); } : null }, t('backup')))));

    main.appendChild(renderSettings());
  }

  function copyText(text, pre) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text, pre); });
    }
    return Promise.resolve(fallbackCopy(text, pre));
  }
  function fallbackCopy(text, pre) {
    var ta = h('textarea', { style: 'position:fixed;left:-9999px;top:0', readonly: true, value: text });
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (!ok && pre) { var r = document.createRange(); r.selectNodeContents(pre); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    return ok;
  }
  function mockBackup() { api('backup').then(function (d) { pre_download(JSON.stringify(d, null, 2)); }); }
  function pre_download(text) {
    var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: 'gym-backup.json' });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // ===================================================================== Settings
  function renderSettings() {
    var wrap = h('div', { class: 'section' }, h('h2', { style: 'font-size:1.2rem;margin-top:12px', text: t('settings') }));
    wrap.appendChild(renderTemplatesSettings());
    wrap.appendChild(renderExercisesSettings());
    wrap.appendChild(renderDevicesSettings());
    return wrap;
  }

  function renderDevicesSettings() {
    var sec = h('div', { class: 'section' }, h('h2', { text: t('devices') }));
    var st = S.settings;
    if (!st.devices) { st.devices = 'loading'; api('devices').then(function (d) { st.devices = d; if (S.tab === 'export') render(); }).catch(fail); }
    if (!st.devices || st.devices === 'loading') { sec.appendChild(h('p', { class: 'muted', text: t('loading') })); return sec; }
    var list = h('div', { class: 'list' });
    st.devices.devices.forEach(function (dv) {
      var item = h('div', { class: 'item' },
        h('div', { class: 'item-head' },
          h('span', null, h('span', { class: 'item-title', text: dv.label }), dv.current ? h('span', { class: 'muted small', text: ' · ' + t('this_device') }) : null),
          h('button', { class: 'btn small danger', type: 'button', onclick: function () { st.confirmDevice = dv.id; render(); } }, t('remove'))),
        h('div', { class: 'note', text: t('last_seen', { when: relTime(dv.lastSeenAt) }) }));
      if (st.confirmDevice === dv.id) {
        item.appendChild(h('div', { class: 'confirm', style: 'margin-top:8px' }, h('span', { style: 'flex:1', text: dv.current ? t('remove_self_q') : t('remove_device_q') }),
          h('button', { class: 'btn small danger', type: 'button', onclick: function () {
            api('device-delete', null, { id: dv.id }).then(function () { st.confirmDevice = null; st.devices = null; if (dv.current) location.reload(); else render(); }).catch(fail);
          } }, t('remove')),
          h('button', { class: 'btn small', type: 'button', onclick: function () { st.confirmDevice = null; render(); } }, t('cancel'))));
      }
      list.appendChild(item);
    });
    sec.appendChild(list);
    return sec;
  }

  function renderExercisesSettings() {
    var st = S.settings;
    var sec = h('div', { class: 'section' }, h('div', { class: 'spread' }, h('h2', { text: t('exercises') }),
      h('button', { class: 'btn small', type: 'button', onclick: function () { st.editEx = { id: null, name: '', kind: 0, aliases: [], archived: false }; render(); } }, t('new_exercise'))));
    if (st.editEx && !st.editEx.id) sec.appendChild(exerciseForm(st.editEx));
    var list = h('div', { class: 'list', style: 'margin-top:8px' });
    if (!exercises().length) list.appendChild(h('p', { class: 'muted small', style: 'padding:10px 0', text: t('no_exercises_yet') }));
    exercises().forEach(function (e) {
      var item = h('div', { class: 'item' });
      item.appendChild(h('button', { class: 'item-toggle', type: 'button', onclick: function () {
        st.editEx = (st.editEx && st.editEx.id === e.id) ? null : { id: e.id, name: e.name, kind: e.kind, aliases: (e.aliases || []).slice(), archived: e.archived }; render();
      } }, h('div', { class: 'item-head' }, h('span', { class: 'item-title', text: e.name }),
        h('span', { class: 'muted small', text: t('kind_' + e.kind) + (e.archived ? ' · ' + t('archived') : '') })),
        e.aliases && e.aliases.length ? h('div', { class: 'note', text: e.aliases.join(', ') }) : null));
      if (st.editEx && st.editEx.id === e.id) item.appendChild(exerciseForm(st.editEx));
      list.appendChild(item);
    });
    sec.appendChild(list);
    return sec;
  }

  function exerciseForm(ed) {
    var nameIn = h('input', { class: 'input', value: ed.name, maxlength: '100' });
    var kindSel = h('select', { class: 'select' }, [0, 1, 2].map(function (k) { return h('option', { value: String(k), selected: ed.kind === k }, t('kind_' + k)); }));
    var aliasIn = h('input', { class: 'input', value: ed.aliases.join(', ') });
    var arch = h('input', { type: 'checkbox', checked: ed.archived });
    return h('form', { class: 'stack', style: 'margin-top:10px', onsubmit: function (ev) {
      ev.preventDefault();
      api('exercise-save', null, { id: ed.id, name: nameIn.value.trim(), kind: +kindSel.value, archived: arch.checked,
        aliases: aliasIn.value.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; }) })
        .then(function () { S.settings.editEx = null; toast(t('saved')); return refreshStart(); }).then(render).catch(fail);
    } },
      h('label', { class: 'field' }, h('span', { text: t('name') }), nameIn),
      h('label', { class: 'field' }, h('span', { text: t('kind') }), kindSel),
      h('label', { class: 'field' }, h('span', { text: t('aliases') }), aliasIn),
      h('label', { class: 'row' }, arch, h('span', { text: t('archived') })),
      h('div', { class: 'row' }, h('button', { class: 'btn primary small', type: 'submit' }, t('save')),
        h('button', { class: 'btn small ghost', type: 'button', onclick: function () { S.settings.editEx = null; render(); } }, t('cancel'))));
  }

  function renderTemplatesSettings() {
    var st = S.settings;
    var sec = h('div', { class: 'section' }, h('div', { class: 'spread' }, h('h2', { text: t('templates') }),
      h('button', { class: 'btn small', type: 'button', onclick: function () { st.editTpl = { id: null, name: '', exerciseIds: [] }; render(); } }, t('new_template'))));
    if (st.editTpl && !st.editTpl.id) sec.appendChild(templateForm(st.editTpl));
    var list = h('div', { class: 'list', style: 'margin-top:8px' });
    templates().forEach(function (tp) {
      var item = h('div', { class: 'item' });
      item.appendChild(h('button', { class: 'item-toggle', type: 'button', onclick: function () {
        st.editTpl = (st.editTpl && st.editTpl.id === tp.id) ? null : { id: tp.id, name: tp.name, exerciseIds: tp.exerciseIds.slice() }; st.confirmTpl = null; render();
      } }, h('div', { class: 'item-head' }, h('span', { class: 'item-title', text: tp.name }), h('span', { class: 'muted small', text: String(tp.exerciseIds.length) })),
        h('div', { class: 'note', text: tp.exerciseIds.map(function (id) { var e = exerciseById(id); return e ? e.name : '?'; }).join(', ') })));
      if (st.editTpl && st.editTpl.id === tp.id) item.appendChild(templateForm(st.editTpl));
      list.appendChild(item);
    });
    sec.appendChild(list);
    return sec;
  }

  function templateForm(ed) {
    var st = S.settings;
    var nameIn = h('input', { class: 'input', value: ed.name, maxlength: '50', oninput: function () { ed.name = nameIn.value; } });
    var rows = h('div', { class: 'list' });
    ed.exerciseIds.forEach(function (id, i) {
      var e = exerciseById(id);
      rows.appendChild(h('div', { class: 'item spread', style: 'padding:6px 2px' }, h('span', { text: (i + 1) + '. ' + (e ? e.name : '?') }),
        h('span', { class: 'row', style: 'gap:2px' },
          h('button', { class: 'iconbtn', type: 'button', 'aria-label': t('move_up'), disabled: i === 0, onclick: function () { swap(ed.exerciseIds, i, i - 1); render(); } }, icon('up')),
          h('button', { class: 'iconbtn', type: 'button', 'aria-label': t('move_down'), disabled: i === ed.exerciseIds.length - 1, onclick: function () { swap(ed.exerciseIds, i, i + 1); render(); } }, icon('down')),
          h('button', { class: 'iconbtn', type: 'button', 'aria-label': t('remove_ex'), onclick: function () { ed.exerciseIds.splice(i, 1); render(); } }, icon('x')))));
    });
    var sel = h('select', { class: 'select', 'aria-label': t('add_exercise') }, h('option', { value: '' }, t('add_exercise') + '…'),
      exercises().filter(function (e) { return !e.archived; }).map(function (e) { return h('option', { value: String(e.id) }, e.name); }));
    sel.addEventListener('change', function () { if (sel.value) { ed.exerciseIds.push(+sel.value); render(); } });

    var form = h('form', { class: 'stack', style: 'margin-top:10px', onsubmit: function (ev) {
      ev.preventDefault();
      if (!ed.name.trim()) { nameIn.focus(); return; }
      api('template-save', null, { id: ed.id, name: ed.name.trim(), exerciseIds: ed.exerciseIds })
        .then(function () { st.editTpl = null; toast(t('saved')); return refreshStart(); }).then(render).catch(fail);
    } },
      h('label', { class: 'field' }, h('span', { text: t('template_name') }), nameIn),
      h('div', null, h('span', { class: 'muted small', text: t('template_exercises') }), rows), sel,
      h('div', { class: 'row' }, h('button', { class: 'btn primary small', type: 'submit' }, t('save')),
        h('button', { class: 'btn small ghost', type: 'button', onclick: function () { st.editTpl = null; render(); } }, t('cancel')),
        ed.id ? h('button', { class: 'btn small danger', type: 'button', onclick: function () { st.confirmTpl = ed.id; render(); } }, t('delete_template')) : null));
    if (ed.id && st.confirmTpl === ed.id) {
      form.appendChild(h('div', { class: 'confirm' }, h('span', { style: 'flex:1', text: t('delete_template_q') }),
        h('button', { class: 'btn small danger', type: 'button', onclick: function () {
          api('template-delete', null, { id: ed.id }).then(function () { st.editTpl = null; st.confirmTpl = null; return refreshStart(); }).then(render).catch(fail);
        } }, t('delete')),
        h('button', { class: 'btn small', type: 'button', onclick: function () { st.confirmTpl = null; render(); } }, t('cancel'))));
    }
    return form;
  }

  function swap(a, i, j) { var x = a[i]; a[i] = a[j]; a[j] = x; }

  // ===================================================================== boot
  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (b) {
      b.addEventListener('click', function () {
        var tab = b.getAttribute('data-tab');
        if (tab === 'history') S.history = null;
        if (tab === 'stats') S.stats = null;
        if (tab === 'export') { S.exp = null; S.settings.devices = null; }
        go(tab);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (b) {
      b.addEventListener('click', function () { lang = b.getAttribute('data-lang'); store.set('gym.lang', lang); render(); });
    });
    window.addEventListener('online', function () { syncQueue(false); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') { syncQueue(false); renderRestBar(); }
      else saveDraftNow(); // phone locked or app switched: do not wait for the debounce
    });
    window.addEventListener('pagehide', saveDraftNow);
    setInterval(function () { syncQueue(false); }, 60000);

    renderChrome();
    append($('#main'), h('p', { class: 'empty', text: t('loading') }));
    refreshStart().then(function () { if (S.start) render(); syncQueue(false); });
  }

  init();
})();
