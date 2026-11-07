// Log hub: start a session or a log, and recent activity with details, edit and delete.
import { h, ICONS, topbar } from './dom.js';
import { openSheet } from './sheet.js';
import { canEditLog, reopenSession } from './sessionSummary.js';
import { currentPlan, estimateMinutes } from '../plan.js';
import { DAY_NAMES, formatDay, formatShort } from '../dates.js';
import { setsText } from '../summary.js';

const COLLECTION = { strength: 'strengthLogs', checkin: 'checkins', benchmark: 'benchmarks' };

function choice(icon, cls, title, sub, onclick) {
  return h('button', { class: 'big-choice', type: 'button', onclick },
    h('span', { class: `dot ${cls}`, html: icon.startsWith('<') ? icon : null }, icon.startsWith('<') ? null : icon),
    h('span', { class: 'grow' }, h('b', null, title), sub ? h('span', null, sub) : null),
    h('span', { class: 'chev', html: ICONS.chev }));
}

function recentItems(state) {
  const items = [
    ...state.strengthLogs.map((l) => ({ kind: 'strength', id: l.id, date: l.date, at: l.createdAt || '', title: `Session ${l.sessionId}`, sub: [l.durationMin ? `${l.durationMin} min` : '', typeof l.rpe === 'number' ? `effort ${l.rpe}/10` : ''].filter(Boolean).join(' · ') })),
    ...state.checkins.map((c) => ({ kind: 'checkin', id: c.id, date: c.date, at: '', title: 'Check-in', sub: `energy ${c.energy ?? '–'} · sleep ${c.sleep ?? '–'} · legs ${c.legSoreness ?? '–'}` })),
    ...state.benchmarks.map((b) => ({ kind: 'benchmark', id: b.id, date: b.date, at: '', title: 'Benchmark test', sub: b.notes || '' })),
  ];
  return items.sort((a, b) => (a.date === b.date ? (b.at > a.at ? 1 : -1) : a.date < b.date ? 1 : -1));
}

export function logView(app) {
  const s = app.state;
  const plan = currentPlan(s);
  const dayOf = (id) => Object.keys(s.schedule.strengthDays).find((d) => s.schedule.strengthDays[d] === id);
  const recent = recentItems(s).slice(0, 15);
  return h('div', null,
    topbar('Log'),
    h('div', { class: 'content' },
      s.draft ? h('div', { class: 'card accent-strength' },
        h('h3', null, `Session ${s.draft.sessionId} in progress`),
        h('p', { class: 'small muted' }, `Started ${formatDay(s.draft.date)}.`),
        h('button', { class: 'btn strength block', type: 'button', onclick: () => app.go(`#/log/strength/${s.draft.sessionId}`) }, 'Resume')) : null,
      ['A', 'B'].map((id) => choice(id, 'strength', `Session ${id}`,
        `${plan.sessions[id].focus} · ~${estimateMinutes(plan.sessions[id])} min${dayOf(id) ? ` · ${DAY_NAMES[dayOf(id)]}s` : ''}`,
        () => app.go(`#/log/strength/${id}`))),
      choice(ICONS.heart, 'other', 'Morning check-in', 'Energy, sleep, leg soreness', () => app.go('#/log/checkin')),
      choice(ICONS.flag, 'other', 'Benchmark test', 'Every 4–8 weeks', () => app.go('#/log/benchmark')),
      h('div', { class: 'section-title' }, 'Recent'),
      recent.length
        ? h('div', { class: 'list' }, recent.map((it) => h('button', { class: 'list-item', type: 'button', onclick: () => showLogDetail(app, it.kind, it.id) },
          h('span', { class: 'grow' }, h('b', null, it.title), h('div', { class: 'small muted' }, `${formatDay(it.date)}${it.sub ? ` · ${it.sub}` : ''}`)),
          h('span', { class: 'chev', html: ICONS.chev }))))
        : h('p', { class: 'muted' }, 'Nothing logged yet.')));
}

// Delete straight away and offer Undo: quicker than "are you sure?", and a mis-tap costs nothing.
export function deleteWithUndo(app, kind, id, message) {
  const key = COLLECTION[kind];
  const index = app.state[key].findIndex((x) => x.id === id);
  if (index < 0) return;
  const item = app.state[key][index];
  app.update((s) => ({ ...s, [key]: s[key].filter((x) => x.id !== id) }));
  app.toast(message, {
    ms: 6000,
    action: {
      label: 'Undo',
      run: () => app.update((s) => {
        if (s[key].some((x) => x.id === id)) return s;
        const list = [...s[key]];
        list.splice(Math.min(index, list.length), 0, item);
        return { ...s, [key]: list };
      }, 'Restored'),
    },
  });
}

function line(label, value) {
  return value === null || value === undefined || value === '' ? null
    : h('div', { class: 'rx-line' }, h('span', { class: 'muted' }, label), h('span', { class: 'strong' }, String(value)));
}

export function showLogDetail(app, kind, id) {
  const item = app.state[COLLECTION[kind]].find((x) => x.id === id);
  if (!item) return;
  const titles = { strength: `Session ${item.sessionId}`, checkin: 'Check-in', benchmark: 'Benchmark test' };
  openSheet(app, `${titles[kind]} · ${formatDay(item.date)}`, (close) => {
    const body = [];
    if (kind === 'strength') {
      body.push(h('div', { class: 'card stack' },
        line('Duration', item.durationMin ? `${item.durationMin} min` : null),
        line('Session effort', typeof item.rpe === 'number' ? `${item.rpe}/10` : null),
        line('Energy before', typeof item.energyBefore === 'number' ? `${item.energyBefore}/5` : null)));
      body.push(h('div', { class: 'card stack' }, item.exercises.map((e) => h('div', null,
        h('div', { class: 'strong' }, e.variation), h('div', { class: 'small muted' }, setsText(e))))));
      if (item.pain) body.push(h('div', { class: 'card warn' }, h('b', null, 'Pain note: '), item.pain));
      if (item.notes) body.push(h('div', { class: 'card' }, item.notes));
    } else if (kind === 'checkin') {
      body.push(h('div', { class: 'card stack' },
        line('Energy', item.energy != null ? `${item.energy}/5` : null),
        line('Sleep', item.sleep != null ? `${item.sleep}/5` : null),
        line('Leg soreness', item.legSoreness != null ? `${item.legSoreness}/5` : null),
        item.pain ? h('p', null, h('b', null, 'Pain or concern: '), item.pain) : null));
    } else {
      body.push(h('div', { class: 'card stack' },
        line('Press-ups', item.pressUps),
        line('Front plank', item.plankSec != null ? `${item.plankSec} s` : null),
        line('SL glute bridge', item.bridgeLeft != null || item.bridgeRight != null ? `L ${item.bridgeLeft ?? '–'} · R ${item.bridgeRight ?? '–'}` : null),
        line('Squats', item.squats),
        line('Reverse lunges (per leg)', item.lunges),
        item.notes ? h('p', { class: 'small muted' }, item.notes) : null));
    }
    const remove = () => {
      close();
      deleteWithUndo(app, kind, id, `${titles[kind]} on ${formatShort(item.date)} deleted.`);
    };
    const edit = kind === 'strength'
      ? (canEditLog(app, item) ? () => { close(); reopenSession(app, id); } : null)
      : () => { close(); app.go(`#/log/${kind}/${encodeURIComponent(id)}`); };
    body.push(h('div', { class: 'btn-row' },
      edit ? h('button', { class: 'btn', type: 'button', onclick: edit }, 'Edit') : null,
      h('button', { class: 'btn danger', type: 'button', onclick: remove }, 'Delete')));
    if (kind === 'strength' && !edit) body.push(h('p', { class: 'tiny muted' }, 'Sessions can be edited for 48 hours after saving.'));
    return h('div', null, body);
  });
}
