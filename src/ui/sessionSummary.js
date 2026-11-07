// After Finish: what you did against last time, any pain, what the coach now suggests, and a backup nudge.
import { h, topbar } from './dom.js';
import { coachReview } from '../coach.js';
import { setsText } from '../summary.js';
import { daysBetween, formatDay, formatShort } from '../dates.js';
import { SAFETY_NOTE } from '../library.js';
import { draftFromLog } from '../draft.js';
import { backupNow } from './plan.js';

const EDIT_WINDOW_MS = 48 * 3600 * 1000;
const byTime = (a, b) => (a.date === b.date ? String(a.createdAt).localeCompare(String(b.createdAt)) : a.date < b.date ? -1 : 1);

export function canEditLog(app, log) {
  const t = Date.parse(log.createdAt);
  return Number.isFinite(t) && app.now().getTime() - t <= EDIT_WINDOW_MS;
}

export function reopenSession(app, id) {
  const log = app.state.strengthLogs.find((l) => l.id === id);
  if (!log) return;
  if (app.state.draft) { app.toast('Finish or discard the session in progress first.'); return; }
  app.editRows = null;
  app.save((x) => ({ ...x, draft: draftFromLog(log) }));
  app.go(`#/log/strength/${log.sessionId}`);
}

function avgOf(e) {
  return e && e.sets && e.sets.length ? e.sets.reduce((s, x) => s + (Number(x.value) || 0), 0) / e.sets.length : null;
}

function compare(e, prevE) {
  if (e.status === 'skipped') return h('span', { class: 'tag' }, 'skipped');
  if (!prevE || prevE.status === 'skipped' || prevE.variation !== e.variation) return h('span', { class: 'tag' }, 'first time');
  const a = avgOf(e);
  const b = avgOf(prevE);
  if (a === null || b === null) return null;
  const diff = Math.round((a - b) * 10) / 10;
  const unit = e.target && e.target.unit === 'seconds' ? ' s' : '';
  if (diff > 0) return h('span', { class: 'tag good' }, `▲ ${diff}${unit} a set`);
  if (diff < 0) return h('span', { class: 'tag warn' }, `▼ ${Math.abs(diff)}${unit} a set`);
  return h('span', { class: 'tag' }, 'same as last time');
}

export function sessionSummaryView(app) {
  const log = app.state.strengthLogs.find((l) => l.id === app.route.id);
  if (!log) {
    return h('div', null, topbar('Session'), h('div', { class: 'content' }, h('p', { class: 'muted' }, 'This session is no longer here.'),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => app.go('#/week') }, 'Back to the week')));
  }
  const s = app.state;
  const today = app.today();
  const prev = s.strengthLogs.filter((l) => l.sessionId === log.sessionId && l.id !== log.id && byTime(l, log) < 0).sort(byTime).pop() || null;
  const freshKeys = new Set(app.freshSuggestions || []);
  const fresh = coachReview(s, today).suggestions.filter((x) => freshKeys.has(x.key));
  const done = log.exercises.reduce((n, e) => n + (e.sets ? e.sets.length : 0), 0);
  const planned = log.exercises.reduce((n, e) => n + (e.target ? e.target.sets * (e.target.sides ? e.target.sides.length : 1) : 0), 0);
  const painful = log.exercises.filter((e) => e.pain || (e.status === 'skipped' && e.reason === 'Pain'));
  const lastBackup = s.settings.lastBackupAt;
  const backupDue = !lastBackup || daysBetween(lastBackup, today) >= 7;

  return h('div', null,
    topbar(`Session ${log.sessionId} saved`, { sub: formatDay(log.date) }),
    h('div', { class: 'content' },
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, `${done}/${planned}`), h('span', null, 'sets')),
        h('div', { class: 'stat' }, h('b', null, `${log.durationMin ?? '–'} min`), h('span', null, typeof log.rpe === 'number' ? `effort ${log.rpe}/10` : 'no effort rating'))),
      painful.length || log.pain ? h('div', { class: 'card warn' },
        h('h3', null, 'Pain noted'),
        painful.length ? h('p', { class: 'small' }, painful.map((e) => e.variation).join(', ')) : null,
        log.pain ? h('p', { class: 'small' }, log.pain) : null,
        h('p', { class: 'small muted' }, `The coach will ease off rather than push. ${SAFETY_NOTE}`)) : null,
      fresh.length ? h('button', { class: 'big-choice', type: 'button', onclick: () => app.go('#/coach') },
        h('span', { class: 'grow' }, h('b', null, `${fresh.length} new coach suggestion${fresh.length > 1 ? 's' : ''}`),
          h('span', null, fresh.map((x) => x.title).join('; '))),
        h('span', { class: 'tag strength' }, 'Review')) : null,
      h('div', { class: 'section-title' }, prev ? `Compared with ${formatShort(prev.date)}` : 'Your first log of this session'),
      h('div', { class: 'list' }, log.exercises.map((e) => {
        const prevE = prev ? prev.exercises.find((x) => x.exerciseId === e.exerciseId) : null;
        return h('div', { class: 'list-item' },
          h('span', { class: 'grow' }, h('b', null, e.variation), h('div', { class: 'small muted' }, setsText(e))),
          compare(e, prevE));
      })),
      backupDue ? h('div', { class: 'card warn' },
        h('h3', null, 'Back up your training'),
        h('p', { class: 'small' }, lastBackup ? `Last backup ${formatShort(lastBackup)}.` : 'Not backed up yet.', ' It only lives on this phone.'),
        h('button', { class: 'btn block', type: 'button', onclick: () => backupNow(app) }, 'Back up now')) : null,
      h('div', { class: 'btn-row' },
        canEditLog(app, log) ? h('button', { class: 'btn', type: 'button', onclick: () => reopenSession(app, log.id) }, 'Edit session') : null,
        h('button', { class: 'btn primary', type: 'button', onclick: () => app.go('#/week') }, 'Done'))));
}
