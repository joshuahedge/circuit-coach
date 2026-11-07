// Morning check-in and benchmark test forms.
import { h, topbar, scaleChips, field, group, numberInput } from './dom.js';
import { confirmSheet } from './sheet.js';
import { formatShort, isISODate } from '../dates.js';

import { newId } from '../store.js';
import { SAFETY_NOTE, FRONT_PLANK_NOTE } from '../library.js';

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
        group('Energy', scaleChips({ min: 1, max: 5, value: f.energy, label: 'Energy', lowLabel: 'Drained', highLabel: 'Great', bad: 'low', onChange: (v) => { f.energy = v; } })),
        group('Sleep', scaleChips({ min: 1, max: 5, value: f.sleep, label: 'Sleep quality', lowLabel: 'Poor', highLabel: 'Great', bad: 'low', onChange: (v) => { f.sleep = v; } })),
        group('Leg soreness', scaleChips({ min: 0, max: 5, value: f.legSoreness, label: 'Leg soreness', lowLabel: 'None', highLabel: 'Severe', bad: 'high', onChange: (v) => { f.legSoreness = v; } }),
          'Some soreness is normal. 4 or 5 tells the coach to hold back on leg increases.'),
        field('Any pain or concern?', h('textarea', { rows: '2', placeholder: 'Leave blank if none', oninput: (e) => { f.pain = e.target.value; } }, f.pain), SAFETY_NOTE)),
      err,
      h('div', { class: 'sticky-action' }, saveBar('Save check-in', save, null))));
}

export function benchmarkView(app) {
  const today = app.today();
  const s = app.state;
  const existing = app.route.id ? s.benchmarks.find((b) => b.id === app.route.id) : null;
  const last = [...s.benchmarks].filter((b) => !existing || b.id !== existing.id).sort((a, b) => (a.date < b.date ? -1 : 1)).pop() || null;
  const f = existing
    ? { ...existing }
    : { id: null, date: today, pressUps: null, plankSec: null, bridgeLeft: null, bridgeRight: null, squats: null, lunges: null, notes: '' };
  const lastHint = (key, unit = '') => (last && last[key] != null ? `Last: ${last[key]}${unit} (${formatShort(last.date)})` : null);
  const num = (key, label, unit = null, hintUnit = '') => field(label,
    numberInput({ value: f[key], unit, label, onInput: (n) => { f[key] = Number.isFinite(n) ? n : null; } }), lastHint(key, hintUnit));
  const err = h('p', { class: 'small', style: { color: 'var(--bad)' }, role: 'alert' });
  const save = () => {
    if (!isISODate(f.date)) { err.textContent = 'Check the date.'; return; }
    const item = {
      id: f.id || newId('bench'), date: f.date, pressUps: f.pressUps, plankSec: f.plankSec, bridgeLeft: f.bridgeLeft,
      bridgeRight: f.bridgeRight, squats: f.squats, lunges: f.lunges, notes: (f.notes || '').trim(),
    };
    const values = [item.pressUps, item.plankSec, item.bridgeLeft, item.bridgeRight, item.squats, item.lunges];
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
        field('Notes', h('textarea', { rows: '2', placeholder: 'Conditions, how it felt', oninput: (e) => { f.notes = e.target.value; } }, f.notes || ''))),
      err,
      h('div', { class: 'sticky-action' }, saveBar('Save benchmark', save, null))));
}
