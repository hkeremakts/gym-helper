/* In-memory stand-in for api.ashx, loaded only when the app runs on localhost.
   Mirrors the server's routes closely enough to build and test the frontend without .NET.
   All data is made up. Kept in localStorage under gym.mockdb; add ?reset to the URL to start over. */
(function () {
  'use strict';
  var KEY = 'gym.mockdb';
  if (/[?&]reset\b/.test(location.search)) { try { localStorage.removeItem(KEY); localStorage.removeItem('gym.draft'); localStorage.removeItem('gym.queue'); } catch (e) { } }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dstr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return dstr(d); }
  function iso(dateStr, h, m) { var p = dateStr.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], h, m).toISOString(); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function seed() {
    var db = { seq: 100, exercises: [], templates: [], workouts: [], devices: [], state: {}, bodyWeights: [] };
    var ex = [
      ['Bench press', 0, ['bench']], ['Wide-grip lat pulldown', 0, ['lat pulldown wide']], ['Dumbbell shoulder press', 0, []],
      ['Cable row', 0, ['seated row']], ['Dumbbell lateral raise', 0, ['lat raise']], ['Cable biceps curl', 0, []],
      ['Rope triceps extension', 0, []], ['Incline dumbbell press', 0, []], ['Face pull', 0, []], ['Hammer curl', 0, []],
      ['Plank', 2, []], ['Leg raise', 1, []]
    ];
    ex.forEach(function (e, i) { db.exercises.push({ id: i + 1, name: e[0], kind: e[1], archived: false, aliases: e[2] }); });
    db.templates.push({ id: 1, name: 'A', position: 1, archived: false, exerciseIds: [1, 2, 3, 4, 5, 6, 7] });
    db.templates.push({ id: 2, name: 'B', position: 2, archived: false, exerciseIds: [4, 8, 9, 5, 10, 11] });
    db.devices.push({ id: 1, label: 'Demo browser', createdAt: new Date(Date.now() - 864e5 * 20).toISOString(), lastSeenAt: new Date().toISOString(), current: true });
    db.devices.push({ id: 2, label: 'Laptop', createdAt: new Date(Date.now() - 864e5 * 19).toISOString(), lastSeenAt: new Date(Date.now() - 864e5 * 3).toISOString(), current: false });

    // Made-up history: alternating A / B every 2–3 days, slowly progressing.
    var plan = [[13, 1], [11, 2], [8, 1], [6, 2], [4, 1], [2, 2]];
    plan.forEach(function (p, k) {
      var date = daysAgo(p[0]), tid = p[1];
      var tp = db.templates[tid - 1];
      var w = { id: ++db.seq, date: date, templateId: tid, comment: k === 4 ? 'Felt good today.' : null, bodyWeightKg: k % 2 ? null : 70 + k * 0.2,
        startedAt: iso(date, 18, 0), endedAt: iso(date, 18, 50 + k), clientId: null, exercises: [] };
      w.updatedAt = w.endedAt;
      tp.exerciseIds.forEach(function (eid) {
        var e = db.exercises[eid - 1];
        var sets = [];
        for (var s = 0; s < 3; s++) {
          if (e.kind === 2) sets.push({ weightKg: null, reps: null, durationSec: 45 + k * 3, restSec: null, formBroke: false, note: null });
          else if (e.kind === 1) sets.push({ weightKg: null, reps: 10 + k - s, durationSec: null, restSec: null, formBroke: false, note: null });
          else sets.push({ weightKg: 10 + eid * 2.5 + Math.floor(k / 2) * 2.5, reps: 10 - s + (k % 2), durationSec: null, restSec: s ? 120 : null, formBroke: s === 2 && k % 3 === 0, note: null });
        }
        w.exercises.push({ exerciseId: eid, comment: eid === 5 && k === 4 ? 'Form slipped on the last reps.' : null, nextTarget: eid === 1 && k === 4 ? 'Try one more rep' : null, sets: sets });
      });
      db.workouts.push(w);
    });
    db.workouts.forEach(function (w) { if (w.bodyWeightKg != null) db.bodyWeights.push({ id: ++db.seq, date: w.date, weightKg: w.bodyWeightKg }); });
    return db;
  }

  function upsertBw(date, kg) {
    var e = db.bodyWeights.filter(function (x) { return x.date === date; })[0];
    if (e) e.weightKg = kg; else db.bodyWeights.push({ id: ++db.seq, date: date, weightKg: kg });
  }

  var db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
  if (!db) db = seed();
  if (!db.bodyWeights) db.bodyWeights = [];
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } }
  persist();

  function err(status, msg) { var e = new Error(msg); e.status = status; return e; }
  function exById(id) { return db.exercises.filter(function (e) { return e.id === id; })[0]; }
  function tplById(id) { return db.templates.filter(function (t) { return t.id === id; })[0]; }
  function byDateDesc(a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id; }

  function full(w) {
    var tp = w.templateId ? tplById(w.templateId) : null;
    var d = clone(w);
    d.templateName = tp ? tp.name : null;
    d.durationMin = (w.startedAt && w.endedAt) ? Math.round((new Date(w.endedAt) - new Date(w.startedAt)) / 60000) : null;
    if (d.durationMin != null && (d.durationMin < 1 || d.durationMin > 600)) d.durationMin = null;
    d.exercises.forEach(function (e) { var x = exById(e.exerciseId); e.name = x.name; e.kind = x.kind; });
    return d;
  }

  function lastPerformance(exId, exclude) {
    var ws = db.workouts.slice().sort(byDateDesc);
    for (var i = 0; i < ws.length; i++) {
      if (ws[i].id === exclude) continue;
      var es = ws[i].exercises.filter(function (e) { return e.exerciseId === exId; });
      if (es.length) { var e = es[es.length - 1]; return { date: ws[i].date, comment: e.comment, nextTarget: e.nextTarget, sets: clone(e.sets) }; }
    }
    return null;
  }

  function findOrCreate(name, kind) {
    var n = name.toLocaleLowerCase();
    var e = db.exercises.filter(function (x) {
      return x.name.toLocaleLowerCase() === n || x.aliases.some(function (a) { return a.toLocaleLowerCase() === n; });
    })[0];
    if (e) return e.id;
    var id = ++db.seq;
    db.exercises.push({ id: id, name: name, kind: kind || 0, archived: false, aliases: [] });
    return id;
  }

  function num(v) { if (v == null || v === '') return null; var n = Number(String(v).replace(',', '.')); if (!isFinite(n)) throw err(400, 'Not a number: ' + v); return n; }

  var routes = {
    start: function () {
      var ws = db.workouts.slice().sort(byDateDesc);
      var last = ws[0];
      var lastT = ws.filter(function (w) { return w.templateId; })[0];
      var lastBw = db.bodyWeights.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
      return {
        exercises: clone(db.exercises).sort(function (a, b) { return a.name.localeCompare(b.name); }),
        templates: clone(db.templates.filter(function (t) { return !t.archived; })).sort(function (a, b) { return a.position - b.position; }),
        lastWorkout: last ? { date: last.date, templateId: last.templateId, templateName: last.templateId ? tplById(last.templateId).name : null } : null,
        lastTemplateId: lastT ? lastT.templateId : null,
        lastBodyWeightKg: lastBw ? lastBw.weightKg : null,
        workoutCount: ws.length
      };
    },
    exercises: function () { return { exercises: clone(db.exercises) }; },
    'template-start': function (p) {
      var tp = tplById(+p.id); if (!tp) throw err(404, 'Template not found.');
      return { templateId: tp.id, exercises: tp.exerciseIds.map(function (id) { var e = exById(id); return { exerciseId: id, name: e.name, kind: e.kind, last: lastPerformance(id, +p.exclude || 0) }; }) };
    },
    'exercise-last': function (p) { return { last: lastPerformance(+p.id, +p.exclude || 0) }; },
    'exercise-history': function (p) {
      var id = +p.id, off = +p.offset || 0, lim = +p.limit || 20;
      var entries = [];
      db.workouts.slice().sort(byDateDesc).forEach(function (w) {
        w.exercises.forEach(function (e) {
          if (e.exerciseId === id) entries.push({ workoutId: w.id, date: w.date, templateName: w.templateId ? tplById(w.templateId).name : null, comment: e.comment, nextTarget: e.nextTarget, sets: clone(e.sets) });
        });
      });
      return { exerciseId: id, name: (exById(id) || {}).name, entries: entries.slice(off, off + lim), hasMore: entries.length > off + lim };
    },
    workouts: function (p) {
      var off = +p.offset || 0, lim = +p.limit || 20;
      var ws = db.workouts.slice().sort(byDateDesc);
      return { workouts: ws.slice(off, off + lim).map(full), hasMore: ws.length > off + lim };
    },
    workout: function (p) {
      var w = db.workouts.filter(function (x) { return x.id === +p.id; })[0];
      if (!w) throw err(404, 'Workout not found.');
      return { workout: full(w) };
    },
    'workout-save': function (p, b) {
      if (!b.date) throw err(400, 'The workout needs a date.');
      var w = (b.id && db.workouts.filter(function (x) { return x.id === b.id; })[0]) ||
              (b.clientId && db.workouts.filter(function (x) { return x.clientId === b.clientId; })[0]);
      var now = new Date().toISOString();
      if (!w) { w = { id: ++db.seq, clientId: b.clientId || null, startedAt: b.startedAt || null, endedAt: b.endedAt || now }; db.workouts.push(w); }
      else { w.startedAt = w.startedAt || b.startedAt || null; w.endedAt = w.endedAt || b.endedAt || now; }
      w.date = b.date; w.templateId = b.templateId || null; w.comment = b.comment || null; w.bodyWeightKg = num(b.bodyWeightKg); w.updatedAt = now;
      if (w.bodyWeightKg != null) upsertBw(w.date, w.bodyWeightKg);
      w.exercises = (b.exercises || []).map(function (e) {
        var id = e.exerciseId || findOrCreate(e.name, e.kind);
        return { exerciseId: id, comment: e.comment || null, nextTarget: e.nextTarget || null, sets: (e.sets || []).map(function (s) {
          var reps = num(s.reps), dur = num(s.durationSec);
          if (reps == null && dur == null) throw err(400, 'Every set needs reps or a duration.');
          if (reps != null && reps * 2 !== Math.floor(reps * 2)) throw err(400, 'Reps can only be whole or half numbers.');
          return { weightKg: num(s.weightKg), reps: reps, durationSec: dur, restSec: num(s.restSec) || null, formBroke: !!s.formBroke, note: s.note || null };
        }) };
      });
      persist();
      return { id: w.id };
    },
    'workout-delete': function (p, b) { db.workouts = db.workouts.filter(function (w) { return w.id !== b.id; }); persist(); return { ok: true }; },
    'exercise-save': function (p, b) {
      if (!b.name) throw err(400, 'The exercise needs a name.');
      var clash = db.exercises.filter(function (e) { return e.id !== b.id && e.name.toLocaleLowerCase() === b.name.toLocaleLowerCase(); })[0];
      if (clash) throw err(409, 'That name is already in use.');
      var e = b.id ? exById(b.id) : null;
      if (!e) { e = { id: ++db.seq }; db.exercises.push(e); }
      e.name = b.name; e.kind = b.kind || 0; e.archived = !!b.archived; e.aliases = b.aliases || [];
      persist(); return { id: e.id };
    },
    'template-save': function (p, b) {
      if (!b.name) throw err(400, 'The template needs a name.');
      var t = b.id ? tplById(b.id) : db.templates.filter(function (x) { return x.name === b.name && x.archived; })[0];
      if (!b.id && db.templates.some(function (x) { return x.name === b.name && !x.archived; })) throw err(409, 'That name is already in use.');
      if (!t) { t = { id: ++db.seq, position: db.templates.length + 1 }; db.templates.push(t); }
      t.name = b.name; t.archived = false; t.exerciseIds = (b.exerciseIds || []).slice();
      persist(); return { id: t.id };
    },
    'template-delete': function (p, b) { var t = tplById(b.id); if (t) t.archived = true; persist(); return { ok: true }; },
    export: function (p) {
      var ws = db.workouts.slice().sort(byDateDesc);
      if (p.since === 'last') { var since = db.state.last_export_at; if (since) ws = ws.filter(function (w) { return w.updatedAt > since; }); }
      else ws = ws.filter(function (w) { return w.date >= p.from && w.date <= p.to; });
      return { workouts: ws.map(full), lastExportAt: db.state.last_export_at || null };
    },
    'export-mark': function () { db.state.last_export_at = new Date().toISOString(); persist(); return { lastExportAt: db.state.last_export_at }; },
    stats: function (p) {
      var today = p.today, td = new Date(today);
      var dow = (new Date(today + 'T00:00:00').getDay() + 6) % 7;
      var weekStart = (function () { var d = new Date(today + 'T00:00:00'); d.setDate(d.getDate() - dow); return dstr(d); })();
      var back28 = (function () { var d = new Date(today + 'T00:00:00'); d.setDate(d.getDate() - 28); return dstr(d); })();
      var back30 = (function () { var d = new Date(today + 'T00:00:00'); d.setDate(d.getDate() - 30); return dstr(d); })();
      var ws = db.workouts.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id; });
      var durs = [];
      var totals = { thisWeek: 0, thisMonth: 0, allTime: ws.length, perWeekLast4: 0, avgDurationMin: null };
      var c28 = 0;
      ws.forEach(function (w) {
        if (w.date >= weekStart && w.date <= today) totals.thisWeek++;
        if (w.date.slice(0, 7) === today.slice(0, 7) && w.date <= today) totals.thisMonth++;
        if (w.date > back28 && w.date <= today) c28++;
        var f = full(w); if (f.durationMin != null && f.durationMin <= 300) durs.push(f.durationMin);
      });
      totals.perWeekLast4 = Math.round(c28 / 4 * 10) / 10;
      if (durs.length) totals.avgDurationMin = Math.round(durs.reduce(function (a, b) { return a + b; }, 0) / durs.length);
      var bwRows = db.bodyWeights.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var body = { history: bwRows.slice().reverse() };
      if (bwRows.length) {
        var latest = bwRows[bwRows.length - 1];
        var first30 = bwRows.filter(function (w) { return w.date >= back30; })[0];
        body.latestKg = latest.weightKg; body.latestDate = latest.date;
        body.change30Kg = first30 && first30 !== latest ? Math.round((latest.weightKg - first30.weightKg) * 100) / 100 : null;
      }
      var per = {};
      ws.forEach(function (w) {
        w.exercises.forEach(function (e) {
          var x = exById(e.exerciseId);
          var r = per[e.exerciseId] || (per[e.exerciseId] = { exerciseId: x.id, name: x.name, kind: x.kind, sessions: 0, firstWeightKg: null, latestWeightKg: null, lastDate: null, best: {} });
          r.sessions++; r.lastDate = w.date;
          var mw = null; e.sets.forEach(function (s) { if (s.weightKg != null && (mw == null || s.weightKg > mw)) mw = s.weightKg; });
          if (r.sessions === 1) r.firstWeightKg = mw;
          r.latestWeightKg = mw;
          e.sets.forEach(function (s) {
            if (x.kind === 2) { if (s.durationSec != null && (r.best.durationSec == null || s.durationSec > r.best.durationSec)) r.best.durationSec = s.durationSec; }
            else if (x.kind === 0 && s.weightKg != null) {
              if (r.best.weightKg == null || s.weightKg > r.best.weightKg || (s.weightKg === r.best.weightKg && s.reps > r.best.reps)) r.best = { weightKg: s.weightKg, reps: s.reps };
            } else if (s.reps != null && (r.best.reps == null || s.reps > r.best.reps)) r.best = { reps: s.reps };
          });
        });
      });
      var list = Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
      return { totals: totals, bodyWeight: body, exercises: list };
    },
    backup: function () { return clone(db); },
    devices: function () { return { devices: clone(db.devices), maxDevices: 3, enrollOpen: false }; },
    'bodyweight-save': function (p, b) { var kg = num(b.weightKg); if (kg == null || kg < 20 || kg > 300) throw err(400, 'Body weight must be between 20 and 300.'); upsertBw(b.date, kg); persist(); return { ok: true }; },
    'bodyweight-delete': function (p, b) { db.bodyWeights = db.bodyWeights.filter(function (x) { return x.id !== b.id; }); persist(); return { ok: true }; },
    import: function (p, b) {
      if (b.format !== 'gym-helper-import-1') throw err(400, 'This is not a gym-helper import file.');
      var r = { exercisesAdded: 0, aliasesAdded: 0, templatesAdded: 0, workoutsAdded: 0, workoutsSkipped: 0, setsAdded: 0, bodyWeightsAdded: 0 };
      function find(n) { n = n.toLocaleLowerCase(); return db.exercises.filter(function (x) { return x.name.toLocaleLowerCase() === n || x.aliases.some(function (a) { return a.toLocaleLowerCase() === n; }); })[0]; }
      (b.exercises || []).forEach(function (e) {
        var x = find(e.name);
        if (!x) { x = { id: ++db.seq, name: e.name, kind: e.kind || 0, archived: false, aliases: [] }; db.exercises.push(x); r.exercisesAdded++; }
        (e.aliases || []).forEach(function (a) { if (!find(a)) { x.aliases.push(a); r.aliasesAdded++; } });
      });
      (b.templates || []).forEach(function (t) {
        if (db.templates.some(function (x) { return x.name.toLocaleLowerCase() === t.name.toLocaleLowerCase(); })) return;
        db.templates.push({ id: ++db.seq, name: t.name, position: db.templates.length + 1, archived: false, exerciseIds: t.exercises.map(function (n) { return findOrCreate(n, 0); }) });
        r.templatesAdded++;
      });
      (b.bodyWeights || []).forEach(function (x) { upsertBw(x.date, x.weightKg); r.bodyWeightsAdded++; });
      (b.workouts || []).forEach(function (w) {
        if (w.clientId && db.workouts.some(function (x) { return x.clientId === w.clientId; })) { r.workoutsSkipped++; return; }
        var tp = w.template ? db.templates.filter(function (x) { return x.name === w.template; })[0] : null;
        var now = new Date().toISOString();
        db.workouts.push({ id: ++db.seq, clientId: w.clientId || null, date: w.date, templateId: tp ? tp.id : null, comment: w.comment || null,
          bodyWeightKg: w.bodyWeightKg == null ? null : w.bodyWeightKg, startedAt: null, endedAt: null, updatedAt: now,
          exercises: (w.exercises || []).map(function (e) {
            var sets = (e.sets || []).filter(function (s) { return s.reps != null || s.durationSec != null; }).map(function (s) {
              r.setsAdded++; return { weightKg: s.weightKg == null ? null : s.weightKg, reps: s.reps == null ? null : s.reps, durationSec: s.durationSec == null ? null : s.durationSec, restSec: s.restSec || null, formBroke: !!s.formBroke, note: s.note || null };
            });
            return { exerciseId: findOrCreate(e.name, e.kind || 0), comment: e.comment || null, nextTarget: e.nextTarget || null, sets: sets };
          }) });
        r.workoutsAdded++;
      });
      persist(); return r;
    },
    'device-delete': function (p, b) { db.devices = db.devices.filter(function (d) { return d.id !== b.id; }); persist(); return { ok: true }; }
  };

  window.GymMock = {
    call: function (route, params, body) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          try {
            if (window.GymMock.offline && body) { var e = new Error('offline'); e.offline = true; throw e; }
            var fn = routes[route];
            if (!fn) throw err(404, 'Unknown route.');
            resolve(clone(fn(params || {}, body || {})));
          } catch (e) { reject(e); }
        }, 60);
      });
    },
    offline: false,
    db: function () { return db; }
  };
})();
