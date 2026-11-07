// Run log, morning check-in and benchmark test forms.
import { h, topbar, chips, scaleChips, field, group, numberInput } from './dom.js';
import { confirmSheet } from './sheet.js';
import { dayKey, formatShort, isISODate } from '../dates.js';
import { formatDuration, formatPace, paceSecPerKm } from '../pace.js';

// 10K time from separate minute and second boxes (the iPhone number pad has no colon).
export function tenKFrom(min, sec) {
  if ((min === null || min === undefined) && (sec === null || sec === undefined)) return { ok: true, value: null };
  const m = Number.isFinite(min) ? min : 0;
  const s = Number.isFinite(sec) ? sec : 0;
  if (Number.isNaN(min) || Number.isNaN(sec) || s > 59 || s < 0) return { ok: false };
  const total = m * 60 + s;
  return total >= 15 * 60 && total <= 180 * 60 ? { ok: true, value: total } : { ok: false };
}
import { newId } from '../store.js';
import { SAFETY_NOTE, FRONT_PLANK_NOTE } from '../library.js';

const RUN_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'intervals', label: 'Intervals' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'long', label: 'Long' },
  { value: 'other', label: 'Other' },
];

function dateInput(value, onChange, max) {
  return h('input', { type: 'date', value, max, onchange: (e) => onChange(e.target.value), oninput: (e) => onChange(e.target.value) });
}

function saveBar(label, onSave, onDelete, cls = 'primary') {
  return h('div', null,
    h('button', { class: `btn ${cls} block`, type: 'button', onclick: onSave }, label),
    onDelete ? h('div', { style: { height: '8px' } }) : null,
    onDelete ? h('button', { class: 'btn ghost block', type: 'button', onclick: onDelete }, 'Delete') : null);
}

function upsert(list, item) {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

function scheduledType(app, date) {
  const t = app.state.schedule.runDays[dayKey(date)];
  return t === 'easy' || t === 'long' ? t : null;
}

export function runView(app) {
  const today = app.today();
  const existing = app.route.id ? app.state.runLogs.find((r) => r.id === app.route.id) : null;
  const pending = app.pendingRunType;
  app.pendingRunType = null;
  const f = existing
    ? { date: existing.date, km: existing.distanceKm, min: Math.floor(existing.durationSec / 60), sec: existing.durationSec % 60, runType: existing.runType, rpe: existing.rpe, affected: Boolean(existing.sorenessAffected), notes: existing.notes || '' }
    : { date: today, km: null, min: null, sec: null, runType: pending === 'easy' || pending === 'long' ? pending : scheduledType(app, today), rpe: null, affected: false, notes: '' };
  const qualityHint = !existing && (pending === 'quality' || app.state.schedule.runDays[dayKey(today)] === 'quality');

  const paceOut = h('b', { class: 'num' }, '–');
  const showPace = () => {
    const sec = (f.min || 0) * 60 + (f.sec || 0);
    paceOut.textContent = formatPace(paceSecPerKm(f.km, sec));
  };
  const err = h('p', { class: 'small', style: { color: 'var(--bad)' }, role: 'alert' });

  const save = () => {
    const sec = (Number.isFinite(f.min) ? f.min : 0) * 60 + (Number.isFinite(f.sec) ? f.sec : 0);
    const problems = [];
    if (!isISODate(f.date)) problems.push('a date');
    if (!(f.km > 0 && f.km <= 200)) problems.push('the distance');
    const badPart = (v, max) => v !== null && v !== undefined && !(Number.isFinite(v) && v >= 0 && v <= max);
    if (!(sec > 0) || badPart(f.min, 1440) || badPart(f.sec, 59)) problems.push('the time');
    if (!f.runType) problems.push('the run type');
    if (problems.length) { err.textContent = `Check ${problems.join(', ')}.`; return; }
    const run = {
      id: existing ? existing.id : newId('run'), date: f.date, distanceKm: Math.round(f.km * 100) / 100, durationSec: sec,
      runType: f.runType, rpe: f.rpe, sorenessAffected: f.affected, notes: f.notes.trim(),
    };
    app.save((s) => ({ ...s, runLogs: upsert(s.runLogs, run) }));
    app.go('#/week');
    app.toast(`Run saved · ${formatPace(paceSecPerKm(run.distanceKm, run.durationSec))}`);
  };
  const del = existing ? async () => {
    const ok = await confirmSheet(app, {
      title: 'Delete this run?', text: `${formatShort(existing.date)}, ${Number(existing.distanceKm).toFixed(1)} km. This can't be undone.`,
      confirmLabel: 'Delete', danger: true,
    });
    if (!ok) return;
    app.save((s) => ({ ...s, runLogs: s.runLogs.filter((r) => r.id !== existing.id) }));
    app.go('#/log');
    app.toast('Run deleted');
  } : null;

  const view = h('div', null,
    topbar(existing ? 'Edit run' : 'Log a run', { back: () => app.go(existing ? '#/log' : '#/week') }),
    h('div', { class: 'content' },
      h('div', { class: 'card' },
        field('Date', dateInput(f.date, (v) => { f.date = v; }, today)),
        field('Distance', numberInput({ value: f.km, decimal: true, unit: 'km', placeholder: '0.0', label: 'Distance in km', onInput: (n) => { f.km = n; showPace(); } })),
        group('Time', h('div', { class: 'grid2' },
          numberInput({ value: f.min, unit: 'min', placeholder: '0', label: 'Minutes', onInput: (n) => { f.min = n; showPace(); } }),
          numberInput({ value: f.sec, unit: 's', placeholder: '0', label: 'Seconds', max: 59, onInput: (n) => { f.sec = n; showPace(); } }))),
        h('div', { class: 'rx-line' }, h('span', { class: 'muted' }, 'Average pace'), paceOut)),
      h('div', { class: 'card' },
        group('Type', chips({ options: RUN_OPTIONS, value: f.runType, label: 'Run type', onChange: (v) => { f.runType = v; } }),
          qualityHint ? 'Quality day: pick tempo or intervals.' : null),
        group('Effort', scaleChips({ min: 1, max: 10, value: f.rpe, label: 'Run effort', lowLabel: 'Very easy', highLabel: 'All-out', onChange: (v) => { f.rpe = v; } })),
        group('Did sore legs affect this run?', chips({ options: [{ value: false, label: 'No' }, { value: true, label: 'Yes' }], value: f.affected, label: 'Sore legs affected the run', onChange: (v) => { f.affected = v; } }),
          'Yes tells the coach to lighten the leg work before your runs.'),
        field('Notes', h('textarea', { rows: '2', placeholder: 'Conditions, how it felt (optional)', oninput: (e) => { f.notes = e.target.value; } }, f.notes))),
      err,
      saveBar('Save run', save, del, 'run')));
  showPace();
  return view;
}

export function checkinView(app) {
  const today = app.today();
  const byId = app.route.id ? app.state.checkins.find((c) => c.id === app.route.id) : null;
  const existing = byId || app.state.checkins.find((c) => c.date === today) || null;
  const f = existing ? { ...existing } : { id: null, date: today, energy: null, sleep: null, legSoreness: null, pain: '' };
  const err = h('p', { class: 'small', style: { color: 'var(--bad)' }, role: 'alert' });
  const save = async () => {
    if (!isISODate(f.date)) { err.textContent = 'Check the date.'; return; }
    if (f.energy === null && f.sleep === null && f.legSoreness === null && !f.pain.trim()) { err.textContent = 'Fill in at least one answer.'; return; }
    const sameDay = app.state.checkins.find((c) => c.date === f.date && c.id !== f.id);
    if (sameDay) {
      const ok = await confirmSheet(app, { title: `Replace the check-in on ${formatShort(f.date)}?`, text: 'There is already a check-in for that day. Saving replaces its answers.', confirmLabel: 'Replace' });
      if (!ok) return;
    }
    const item = { id: f.id || (sameDay ? sameDay.id : newId('chk')), date: f.date, energy: f.energy, sleep: f.sleep, legSoreness: f.legSoreness, pain: f.pain.trim() };
    app.save((s) => ({ ...s, checkins: upsert(s.checkins.filter((c) => !(c.date === item.date && c.id !== item.id)), item) }));
    app.go('#/week');
    app.toast(item.legSoreness >= 4 ? 'Saved. Leg increases are paused while soreness is high.' : 'Check-in saved');
  };
  return h('div', null,
    topbar(existing ? 'Edit check-in' : 'Morning check-in', { back: () => app.go('#/week') }),
    h('div', { class: 'content' },
      h('div', { class: 'card' },
        field('Date', dateInput(f.date, (v) => { f.date = v; }, today)),
        group('Energy', scaleChips({ min: 1, max: 5, value: f.energy, label: 'Energy', lowLabel: 'Drained', highLabel: 'Great', onChange: (v) => { f.energy = v; } })),
        group('Sleep', scaleChips({ min: 1, max: 5, value: f.sleep, label: 'Sleep quality', lowLabel: 'Poor', highLabel: 'Great', onChange: (v) => { f.sleep = v; } })),
        group('Leg soreness', scaleChips({ min: 0, max: 5, value: f.legSoreness, label: 'Leg soreness', lowLabel: 'None', highLabel: 'Severe', onChange: (v) => { f.legSoreness = v; } }),
          'Some soreness is normal. 4 or 5, or soreness that changes how you run, tells the coach to hold back.'),
        field('Any pain or concern?', h('textarea', { rows: '2', placeholder: 'Leave blank if none', oninput: (e) => { f.pain = e.target.value; } }, f.pain), SAFETY_NOTE)),
      err,
      saveBar('Save check-in', save, null)));
}

export function benchmarkView(app) {
  const today = app.today();
  const s = app.state;
  const existing = app.route.id ? s.benchmarks.find((b) => b.id === app.route.id) : null;
  const last = [...s.benchmarks].filter((b) => !existing || b.id !== existing.id).sort((a, b) => (a.date < b.date ? -1 : 1)).pop() || null;
  const f = existing
    ? { ...existing, tenKMin: existing.tenKSec ? Math.floor(existing.tenKSec / 60) : null, tenKS: existing.tenKSec ? existing.tenKSec % 60 : null }
    : { id: null, date: today, pressUps: null, plankSec: null, bridgeLeft: null, bridgeRight: null, squats: null, lunges: null, tenKMin: null, tenKS: null, notes: '' };
  const lastHint = (key, unit = '') => (last && last[key] != null ? `Last: ${last[key]}${unit} (${formatShort(last.date)})` : null);
  const num = (key, label, unit = null, hintUnit = '') => field(label,
    numberInput({ value: f[key], unit, label, onInput: (n) => { f[key] = Number.isFinite(n) ? n : null; } }), lastHint(key, hintUnit));
  const err = h('p', { class: 'small', style: { color: 'var(--bad)' }, role: 'alert' });
  const save = () => {
    const tenK = tenKFrom(f.tenKMin, f.tenKS);
    if (!isISODate(f.date)) { err.textContent = 'Check the date.'; return; }
    if (!tenK.ok) { err.textContent = 'Check the 10K time: minutes (15–180) and seconds (0–59).'; return; }
    const tenKSec = tenK.value;
    const item = {
      id: f.id || newId('bench'), date: f.date, pressUps: f.pressUps, plankSec: f.plankSec, bridgeLeft: f.bridgeLeft,
      bridgeRight: f.bridgeRight, squats: f.squats, lunges: f.lunges, tenKSec, notes: (f.notes || '').trim(),
    };
    const values = [item.pressUps, item.plankSec, item.bridgeLeft, item.bridgeRight, item.squats, item.lunges, item.tenKSec];
    if (values.every((v) => v === null)) { err.textContent = 'Fill in at least one test.'; return; }
    app.save((x) => ({ ...x, benchmarks: upsert(x.benchmarks, item) }));
    app.go('#/progress');
    app.toast('Benchmark saved');
  };
  return h('div', null,
    topbar(existing ? 'Edit benchmark' : 'Benchmark test', { back: () => app.go('#/log') }),
    h('div', { class: 'content' },
      h('div', { class: 'card info' },
        h('p', { class: 'small' }, 'Every 4–8 weeks, under similar conditions: fresh, warmed up, same time of day. Fill in only the tests you did.'),
        h('p', { class: 'small muted' }, `Press-ups: one set, stop at the first rep that is not clean. ${FRONT_PLANK_NOTE}`)),
      h('div', { class: 'card' },
        field('Date', dateInput(f.date, (v) => { f.date = v; }, today)),
        h('div', { class: 'grid2' },
          num('pressUps', 'Press-ups'),
          num('plankSec', 'Front plank', 's', ' s'),
          num('bridgeLeft', 'SL bridge left'),
          num('bridgeRight', 'SL bridge right'),
          num('squats', 'Squats'),
          num('lunges', 'Lunges per leg')),
        group('10K time', h('div', { class: 'grid2' },
          numberInput({ value: f.tenKMin, unit: 'min', label: '10K minutes', onInput: (n) => { f.tenKMin = n; } }),
          numberInput({ value: f.tenKS, unit: 's', label: '10K seconds', onInput: (n) => { f.tenKS = n; } })),
        last && last.tenKSec ? `Last: ${formatDuration(last.tenKSec)} (${formatShort(last.date)}). Only when it suits your running; no need to race often.` : 'Only when it suits your running.'),
        field('Notes', h('textarea', { rows: '2', placeholder: 'Conditions, how it felt', oninput: (e) => { f.notes = e.target.value; } }, f.notes || ''))),
      err,
      saveBar('Save benchmark', save, null)));
}
