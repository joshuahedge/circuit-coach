// Week (home): next workout, this week's calendar, totals, prompts.
import { h, ICONS, topbar } from './dom.js';
import { addDays, daysBetween, formatDay, formatShort, DAY_SHORT } from '../dates.js';
import { blockInfo, runProtection, scheduleWarnings, weekModel, SCHEDULE_RUN_LABEL, RUN_TYPE_LABEL } from '../schedule.js';
import { currentPlan, estimateMinutes } from '../plan.js';
import { coachReview } from '../coach.js';
import { showLogDetail } from './log.js';
import { backupNow } from './plan.js';

export function startRun(app, runType) {
  app.pendingRunType = runType || null;
  app.go('#/log/run');
}

function itemLabel(p) {
  return p.kind === 'strength' ? `Session ${p.sessionId}` : SCHEDULE_RUN_LABEL[p.runType] || 'Run';
}

function statusIcon(status) {
  const done = status === 'done' || status === 'moved';
  return h('span', { class: 'st', 'aria-hidden': 'true', html: done ? ICONS.check : '' });
}

const STATUS_TEXT = { done: 'done', moved: 'done on another day', missed: 'missed', today: 'today', upcoming: 'planned' };

function plannedItem(app, d, p) {
  const label = itemLabel(p);
  const onclick = () => {
    if (p.logId) showLogDetail(app, p.kind === 'strength' ? 'strength' : 'run', p.logId);
    else if (p.kind === 'strength') app.go(`#/log/strength/${p.sessionId}`);
    else startRun(app, p.runType);
  };
  return h('button', {
    type: 'button', class: `item ${p.kind === 'strength' ? 'strength' : 'run'} s-${p.status}`, onclick,
    'aria-label': `${label}, ${STATUS_TEXT[p.status]}`,
  }, statusIcon(p.status), label);
}

function extraItems(app, d, used) {
  const out = [];
  for (const r of d.runs.filter((x) => !used.has(x.id))) {
    out.push(h('button', { type: 'button', class: 'item run extra s-done', onclick: () => showLogDetail(app, 'run', r.id), 'aria-label': `Extra run, ${r.distanceKm} km, done` },
      statusIcon('done'), `${RUN_TYPE_LABEL[r.runType] || 'Run'} ${Number(r.distanceKm).toFixed(1)} km`));
  }
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
  if (item.kind === 'strength') {
    const session = currentPlan(s).sessions[item.sessionId];
    const prot = runProtection(s, iso);
    return h('div', { class: 'card next-card accent-strength' },
      h('div', { class: 'when' }, `Next up · ${when}`),
      h('div', { class: 'what' }, `Session ${item.sessionId}`),
      h('p', { class: 'muted small' }, `${session.focus} · about ${estimateMinutes(session)} min`),
      prot.longRunSoon ? h('p', { class: 'small' }, `Lighter legs: long run on ${prot.longDayName}.`) : null,
      !prot.longRunSoon && prot.qualityTomorrow ? h('p', { class: 'small' }, `Quality run tomorrow: keep leg sets 2–3 reps short of failure.`) : null,
      h('button', { class: 'btn strength block', type: 'button', onclick: () => app.go(`#/log/strength/${item.sessionId}`) },
        iso === today ? `Start Session ${item.sessionId}` : `Open Session ${item.sessionId}`));
  }
  return h('div', { class: 'card next-card accent-run' },
    h('div', { class: 'when' }, `Next up · ${when}`),
    h('div', { class: 'what' }, SCHEDULE_RUN_LABEL[item.runType] || 'Run'),
    item.runType === 'long' ? h('p', { class: 'muted small' }, 'Protected: no hard leg work the day before.') : null,
    h('button', { class: 'btn run block', type: 'button', onclick: () => startRun(app, item.runType) }, 'Log run'));
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
  const logCount = s.strengthLogs.length + s.runLogs.length;
  const lastBackup = s.settings.lastBackupAt;
  const backupDue = logCount >= 3 && (!lastBackup || daysBetween(lastBackup, today) >= 14);
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

      liftedYesterday && !checkedToday ? h('div', { class: 'card' },
        h('h3', null, 'How are your legs today?'),
        h('p', { class: 'small muted' }, 'A 20-second check-in after a strength day helps the coach protect your runs.'),
        h('button', { class: 'btn block', type: 'button', onclick: () => app.go('#/log/checkin') }, 'Check in')) : null,

      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, `${m.runsDone}/${m.runsPlanned}`), h('span', null, `runs · ${m.runKm.toFixed(1)} km`)),
        h('div', { class: 'stat' }, h('b', null, `${m.strengthDone}/${m.strengthPlanned}`), h('span', null, 'strength sessions'))),

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
