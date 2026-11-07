// Week (home): next workout, this week's calendar, totals, prompts.
import { h, ICONS, topbar, scaleChips } from './dom.js';
import { startSession } from './strength.js';
import { newId } from '../store.js';
import { addDays, daysBetween, formatDay, formatShort, DAY_SHORT } from '../dates.js';
import { blockInfo, scheduleWarnings, weekModel } from '../schedule.js';
import { currentPlan, estimateMinutes } from '../plan.js';
import { coachReview } from '../coach.js';
import { showLogDetail } from './log.js';
import { backupNow } from './plan.js';

function statusIcon(status) {
  const done = status === 'done' || status === 'moved';
  return h('span', { class: 'st', 'aria-hidden': 'true', html: done ? ICONS.check : '' });
}

const STATUS_TEXT = { done: 'done', moved: 'done on another day', missed: 'missed', today: 'today', upcoming: 'planned' };

function plannedItem(app, d, p) {
  const label = `Session ${p.sessionId}`;
  const onclick = () => {
    if (p.logId) showLogDetail(app, 'strength', p.logId);
    else app.go(`#/log/strength/${p.sessionId}`);
  };
  return h('button', {
    type: 'button', class: `item strength s-${p.status}`, onclick,
    'aria-label': `${label}, ${STATUS_TEXT[p.status]}`,
  }, statusIcon(p.status), label);
}

function extraItems(app, d, used) {
  const out = [];
  for (const l of d.lifts.filter((x) => !used.has(x.id))) {
    out.push(h('button', { type: 'button', class: 'item strength extra s-done', onclick: () => showLogDetail(app, 'strength', l.id), 'aria-label': `Extra Session ${l.sessionId}, done` },
      statusIcon('done'), `Session ${l.sessionId}`));
  }
  return out;
}

function nextCard(app, m) {
  const s = app.state;
  const today = app.today();
  if (s.draft) {
    return h('div', { class: 'card next-card accent-strength' },
      h('div', { class: 'when' }, 'In progress'),
      h('div', { class: 'what' }, `Session ${s.draft.sessionId}`),
      h('p', { class: 'muted small' }, `Started ${formatDay(s.draft.date)}. Everything you tapped is saved.`),
      h('button', { class: 'btn strength block', type: 'button', onclick: () => app.go(`#/log/strength/${s.draft.sessionId}`) }, 'Resume session'));
  }
  if (!m.nextUp) return null;
  const { iso, item } = m.nextUp;
  const when = iso === today ? 'Today' : iso === addDays(today, 1) ? 'Tomorrow' : formatDay(iso);
  const session = currentPlan(s).sessions[item.sessionId];
  return h('div', { class: 'card next-card accent-strength' },
    h('div', { class: 'when' }, `Next up · ${when}`),
    h('div', { class: 'what' }, `Session ${item.sessionId}`),
    h('p', { class: 'muted small' }, `${session.focus} · about ${estimateMinutes(session)} min`),
    iso === today
      ? h('button', { class: 'btn strength block', type: 'button', onclick: () => startSession(app, item.sessionId) }, `Start Session ${item.sessionId}`)
      : [
        h('button', { class: 'btn block', type: 'button', onclick: () => app.go(`#/log/strength/${item.sessionId}`) }, `See Session ${item.sessionId}`),
        h('button', { class: 'link small', type: 'button', onclick: () => startSession(app, item.sessionId) }, 'Train today instead'),
      ]);
}

// "This morning": three taps, saved on the third, with Undo. Shown every day until noon.
function quickCheckin(app) {
  const s = app.state;
  const today = app.today();
  if (s.checkins.some((c) => c.date === today) || app.now().getHours() >= 12) return null;
  if (!app.quickCheck || app.quickCheck.date !== today) app.quickCheck = { date: today, energy: null, sleep: null, legSoreness: null };
  const q = app.quickCheck;
  const answer = (k) => (v) => {
    q[k] = v;
    if (q.energy === null || q.sleep === null || q.legSoreness === null) return;
    const item = { id: newId('chk'), date: today, energy: q.energy, sleep: q.sleep, legSoreness: q.legSoreness, pain: '' };
    app.quickCheck = null;
    app.update((x) => ({ ...x, checkins: [...x.checkins, item] }));
    app.toast(item.legSoreness >= 4 ? 'Check-in saved. Leg increases pause while soreness is high.' : 'Check-in saved.', {
      ms: 6000, action: { label: 'Undo', run: () => app.update((x) => ({ ...x, checkins: x.checkins.filter((c) => c.id !== item.id) })) },
    });
  };
  const row = (label, k, min, max, low, high, bad) => h('div', { class: 'quick-row' },
    h('span', { class: 'strong small' }, label),
    scaleChips({ min, max, value: q[k], label, lowLabel: low, highLabel: high, bad, onChange: answer(k) }));
  return h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('h3', null, 'This morning'),
      h('button', { class: 'link small', type: 'button', onclick: () => app.go('#/log/checkin') }, 'Add a note')),
    h('p', { class: 'small muted' }, 'Three taps. It saves when all three are in.'),
    row('Energy', 'energy', 1, 5, 'Drained', 'Great', 'low'),
    row('Sleep', 'sleep', 1, 5, 'Poor', 'Great', 'low'),
    row('Leg soreness', 'legSoreness', 0, 5, 'None', 'Severe', 'high'));
}

function isInstalled(app) {
  if (app.installed !== undefined) return app.installed;
  const w = app.win;
  return Boolean((w.matchMedia && w.matchMedia('(display-mode: standalone)').matches) || (w.navigator && w.navigator.standalone));
}

export function weekView(app) {
  const s = app.state;
  const today = app.today();
  const m = weekModel(s, today);
  const block = blockInfo(s, today);
  const review = coachReview(s, today);
  const yesterday = addDays(today, -1);
  const liftedYesterday = s.strengthLogs.some((l) => l.date === yesterday);
  const checkedToday = s.checkins.some((c) => c.date === today);
  const logCount = s.strengthLogs.length;
  const thisBlock = s.strengthLogs.filter((l) => !s.block.startDate || l.date >= s.block.startDate).length;
  const lastBackup = s.settings.lastBackupAt;
  const backupDue = logCount >= 3 && (!lastBackup || daysBetween(lastBackup, today) >= 7);
  const warnings = scheduleWarnings(s.schedule);

  return h('div', null,
    topbar('This week', { sub: `${formatShort(m.weekStart)} – ${formatShort(addDays(m.weekStart, 6))}` }),
    h('div', { class: 'content' },
      h('div', { class: 'week-head' },
        h('span', { class: 'tag' }, `Block ${block.number} · Week ${block.week}`),
        h('span', { class: 'tag strength' }, block.label)),

      !isInstalled(app) && !s.settings.installHintDismissed ? h('div', { class: 'card info' },
        h('h3', null, 'Install on your iPhone'),
        h('p', { class: 'small' }, 'In Safari, tap Share, then Add to Home Screen. Open it from the home screen from then on: Safari tabs keep their own separate data.'),
        h('button', { class: 'link', type: 'button', onclick: () => app.update((x) => ({ ...x, settings: { ...x.settings, installHintDismissed: true } })) }, 'Got it')) : null,

      nextCard(app, m),

      quickCheckin(app),

      liftedYesterday && !checkedToday && app.now().getHours() >= 12 ? h('div', { class: 'card' },
        h('h3', null, 'How do you feel after yesterday?'),
        h('p', { class: 'small muted' }, 'A 20-second check-in after a session tells the coach when to push and when to hold back.'),
        h('button', { class: 'btn block', type: 'button', onclick: () => app.go('#/log/checkin') }, 'Check in')) : null,

      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, `${m.strengthDone}/${m.strengthPlanned}`), h('span', null, 'sessions this week')),
        h('div', { class: 'stat' }, h('b', null, String(thisBlock)), h('span', null, `sessions in block ${block.number}`))),

      h('div', { class: 'days', role: 'list', 'aria-label': 'This week' },
        m.days.map((d) => {
          const used = new Set(d.planned.map((p) => p.logId).filter(Boolean));
          const items = [...d.planned.map((p) => plannedItem(app, d, p)), ...extraItems(app, d, used)];
          return h('div', { class: `day${d.isToday ? ' today' : ''}`, role: 'listitem' },
            h('div', null, h('div', { class: 'dname' }, DAY_SHORT[d.key]), h('div', { class: 'ddate' }, formatShort(d.iso))),
            h('div', { class: 'items' }, items.length ? items : h('span', { class: 'empty-day' }, 'Rest')));
        })),

      warnings.map((w) => h('div', { class: `banner ${w.level === 'warn' ? 'warn' : 'run'}` }, w.text)),

      review.suggestions.length ? h('button', { class: 'big-choice', type: 'button', onclick: () => app.go('#/coach') },
        h('span', { class: 'dot strength', html: ICONS.coach }),
        h('span', { class: 'grow' }, h('b', null, `${review.suggestions.length} coach suggestion${review.suggestions.length > 1 ? 's' : ''}`),
          h('span', null, 'Review and accept, edit or reject')),
        h('span', { class: 'chev', html: ICONS.chev })) : null,

      backupDue ? h('div', { class: 'card warn' },
        h('h3', null, 'Back up your training'),
        h('p', { class: 'small' }, lastBackup ? `Last backup ${formatShort(lastBackup)}.` : 'Your data lives only on this phone.',
          ' Save a backup file to Files or iCloud Drive.'),
        h('button', { class: 'btn block', type: 'button', onclick: () => backupNow(app) }, 'Back up now')) : null));
}
