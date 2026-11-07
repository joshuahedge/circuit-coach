// Strength session: preview, then the set-by-set logger. Every tap saves the draft.
import { h, append, ICONS, topbar, stepper, scaleChips, toggle, field, group, numberInput } from './dom.js';
import { workoutDock, openTimerSettings, timerSettings } from './dock.js';
import { unlockSound } from './sound.js';
import { completeSet, upNext, FLOWS } from '../timer.js';
import { openSheet, confirmSheet } from './sheet.js';
import { EXERCISES, WARMUPS, COOLDOWN, REST_NOTE, SAFETY_NOTE } from '../library.js';
import { currentPlan, estimateMinutes, prescriptionLabel, sessionForToday, tempoLabel } from '../plan.js';
import { runProtection } from '../schedule.js';
import { createDraft, setRunProtect, finishDraft, draftProgress, elapsedMinutes } from '../draft.js';
import { coachReview } from '../coach.js';
import { newId } from '../store.js';
import { formatDay } from '../dates.js';

const SIDE_LABEL = { L: 'Left', R: 'Right', Y: 'Y', T: 'T', W: 'W' };
const SKIP_REASONS = ['Short on time', 'Tired', 'Sore', 'Pain', 'No space', 'Other'];

function protectionFor(app, sessionId, date) {
  const session = currentPlan(app.state).sessions[sessionId];
  const prot = runProtection(app.state, date);
  const trims = session.exercises.some((p) => p.runProtectSets && p.runProtectSets < p.sets);
  return { ...prot, applies: prot.longRunSoon && trims };
}

function howTo(exerciseId) {
  const ex = EXERCISES[exerciseId];
  return h('details', { class: 'howto' },
    h('summary', null, 'How to'),
    h('ol', null, ex.howTo.map((t) => h('li', null, t))));
}

function preview(app, sessionId) {
  const s = app.state;
  const today = app.today();
  const session = currentPlan(s).sessions[sessionId];
  const prot = protectionFor(app, sessionId, today);
  let runProtect = prot.applies;
  const list = h('div');
  const drawList = () => {
    const sess = sessionForToday(session, { runProtect });
    list.replaceChildren(h('div', { class: 'list' }, sess.exercises.map((p) => h('div', { class: 'list-item' },
      h('span', { class: 'grow' }, h('b', null, p.variation),
        h('div', { class: 'small muted' }, [prescriptionLabel(p), tempoLabel(p)].filter(Boolean).join(' · ')))))));
  };
  drawList();
  const start = () => {
    // The date is read at the tap: this screen may have been drawn the evening before.
    app.update((x) => ({ ...x, draft: createDraft(x, sessionId, app.today(), { runProtect, nowIso: app.now().toISOString() }) }));
  };
  return h('div', null,
    topbar(`Session ${sessionId}`, { sub: session.focus, back: () => app.go('#/log') }),
    h('div', { class: 'content' },
      h('p', { class: 'muted' }, `About ${estimateMinutes(session)} min including warm-up and cool-down.`),
      prot.applies ? h('div', { class: 'banner run' },
        h('div', { class: 'switch-row' },
          h('span', null, h('b', null, `Long run on ${prot.longDayName}. `), 'Use the lighter version: 2 sets of the single-leg leg work, nothing close to failure.'),
          toggle({ checked: runProtect, label: 'Use the lighter version', onChange: (on) => { runProtect = on; drawList(); } }))) : null,
      !prot.longRunSoon && prot.qualityTomorrow ? h('div', { class: 'banner run' }, `Quality run on ${prot.qualityDayName}: keep the leg sets 2–3 reps short of failure.`) : null,
      h('div', { class: 'card' }, h('h3', null, 'Warm-up · 5 min'), h('p', { class: 'small' }, WARMUPS[sessionId])),
      list,
      h('p', { class: 'small muted' }, REST_NOTE),
      h('button', { class: 'btn strength block', type: 'button', onclick: start }, `Start Session ${sessionId}`)));
}

function conflict(app, sessionId) {
  const d = app.state.draft;
  return h('div', null,
    topbar(`Session ${sessionId}`, { back: () => app.go('#/log') }),
    h('div', { class: 'content' },
      h('div', { class: 'card warn' },
        h('h2', null, `Session ${d.sessionId} is still in progress`),
        h('p', null, `Started ${formatDay(d.date)}. Finish or discard it before starting Session ${sessionId}.`)),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => app.go(`#/log/strength/${d.sessionId}`) }, `Resume Session ${d.sessionId}`),
        h('button', {
          class: 'btn danger', type: 'button',
          onclick: async () => {
            const ok = await confirmSheet(app, { title: `Discard Session ${d.sessionId}?`, text: 'The sets you ticked in it will be lost.', confirmLabel: 'Discard', danger: true });
            if (ok) app.update((x) => ({ ...x, draft: null }));
          },
        }, 'Discard it'))));
}

function setRow(app, e, row, ref, isNext) {
  const unitStep = e.target.unit === 'seconds' ? 5 : 1;
  const el = h('div', { class: `setrow${row.done ? ' is-done' : ''}${isNext ? ' is-next' : ''}`, dataset: { ref: `${ref.ei}:${ref.ri}` } });
  const label = h('div', { class: 'lbl' }, `Set ${row.set}`, row.side ? h('small', null, SIDE_LABEL[row.side] || row.side) : null);
  const step = stepper({
    value: row.value, min: 0, max: e.target.unit === 'seconds' ? 600 : 200, step: unitStep,
    label: `Set ${row.set}${row.side ? ` ${SIDE_LABEL[row.side]}` : ''} ${e.target.unit}`,
    onChange: (v) => { row.value = v; app.save(); },
  });
  const rir = h('select', { 'aria-label': `Reps in reserve, set ${row.set}${row.side ? ` ${SIDE_LABEL[row.side]}` : ''}` },
    h('option', { value: '' }, '–'),
    [0, 1, 2, 3, 4, 5].map((n) => h('option', { value: String(n) }, String(n))));
  rir.value = row.rir === null || row.rir === undefined ? '' : String(row.rir);
  rir.addEventListener('change', () => { row.rir = rir.value === '' ? null : Number(rir.value); app.save(); });
  const tick = h('button', { type: 'button', class: 'tick', 'aria-pressed': String(row.done), 'aria-label': `Set ${row.set}${row.side ? ` ${SIDE_LABEL[row.side]}` : ''} done`, html: ICONS.check });
  tick.addEventListener('click', () => {
    const d = app.state.draft;
    if (row.done) row.done = false;
    else {
      unlockSound(app.win);
      const cfg = timerSettings(app);
      completeSet(d, ref, { flow: cfg.flow, rest: cfg.rest, nowMs: app.now().getTime() });
    }
    app.save();
    app.render();
  });
  el.append(label, step, rir, tick);
  return el;
}

function exerciseCard(app, e, ei, next) {
  const ex = EXERCISES[e.exerciseId];
  const t = e.target;
  const card = h('section', { class: `ex-card${next && next.ei === ei ? ' is-current' : ''}`, 'aria-label': e.variation });
  const bySet = {};
  e.rows.forEach((r, ri) => (bySet[r.set] = bySet[r.set] || []).push({ r, ri }));
  const skipped = e.status === 'skipped';
  card.classList.toggle('skipped', skipped);

  const swapSheet = () => openSheet(app, `Swap ${ex.name}`, (close) => {
    const pick = (name) => {
      e.variation = name;
      e.status = name === t.variation ? 'pending' : 'modified';
      e.reason = name === t.variation ? '' : `Swapped for ${name}`;
      app.save();
      close();
      app.render();
    };
    const options = [...new Set([t.variation, ...ex.ladder.map((l) => l.name), ...ex.swaps.map((s) => s.name)])];
    return h('div', null,
      h('p', { class: 'small muted' }, 'Just for today. A swapped exercise is logged but does not count towards progress. Change the plan from the Plan tab.'),
      h('div', { class: 'list' }, options.map((name) => {
        const swap = ex.swaps.find((s) => s.name === name);
        return h('button', { class: 'list-item', type: 'button', onclick: () => pick(name) },
          h('span', { class: 'grow' }, h('b', null, name, name === t.variation ? ' (planned)' : ''), swap ? h('div', { class: 'small muted' }, swap.note) : null),
          name === e.variation ? h('span', { html: ICONS.check }) : null);
      })));
  });

  const skipSheet = () => openSheet(app, `Skip ${e.variation}?`, (close) => h('div', null,
    h('div', { class: 'chips' }, SKIP_REASONS.map((r) => h('button', {
      class: 'chip', type: 'button',
      onclick: () => { e.status = 'skipped'; e.reason = r; app.save(); close(); app.render(); },
    }, r)))));

  append(card, [
    h('div', { class: 'ex-head' },
      h('h3', null, e.variation, e.status === 'modified' ? h('span', { class: 'tag warn', style: { marginLeft: '8px' } }, 'swapped') : null),
      h('div', { class: 'rx' }, [prescriptionLabel(t), tempoLabel(t)].filter(Boolean).join(' · ')),
      h('div', { class: 'cue' }, ex.cues)),
    howTo(e.exerciseId),
    skipped
      ? h('div', { class: 'ex-head' }, h('p', { class: 'small muted' }, `Skipped: ${e.reason}`))
      : [
        h('div', { class: 'setrow head', 'aria-hidden': 'true', style: { margin: '0 12px' } },
          h('span'), h('span', null, t.unit === 'seconds' ? 'Seconds' : 'Reps'), h('span', null, 'RIR'), h('span', null, 'Done')),
        Object.keys(bySet).map((n) => h('div', { class: 'setgroup' }, bySet[n].map(({ r, ri }) => setRow(app, e, r, { ei, ri }, Boolean(next && next.ei === ei && next.ri === ri))))),
      ],
    h('div', { class: 'ex-actions' },
      skipped
        ? h('button', { class: 'btn', type: 'button', onclick: () => { e.status = 'pending'; e.reason = ''; app.save(); app.render(); } }, 'Undo skip')
        : [
          h('button', {
            class: 'btn', type: 'button', 'aria-pressed': String(e.pain),
            onclick: (ev) => {
              e.pain = !e.pain;
              ev.currentTarget.setAttribute('aria-pressed', String(e.pain));
              app.save();
              if (e.pain) app.toast('Pain noted. Stop if it is sharp or getting worse.', { ms: 4000 });
            },
          }, 'Pain'),
          h('button', { class: 'btn', type: 'button', onclick: swapSheet }, 'Swap'),
          h('button', { class: 'btn', type: 'button', onclick: skipSheet }, 'Skip'),
        ])]);
  if (!skipped && e.rows.length && e.rows.every((r) => r.done)) card.classList.add('done-all');
  return card;
}

function finishSheet(app, sessionId) {
  const d = app.state.draft;
  openSheet(app, `Finish Session ${sessionId}`, (close) => {
    const p = draftProgress(d);
    const elapsed = elapsedMinutes(d, app.now().getTime());
    const err = h('p', { class: 'small', style: { color: 'var(--bad)' }, role: 'alert' });
    const durationInput = numberInput({
      value: d.durationMin, unit: 'min', placeholder: String(elapsed), label: 'Duration in minutes',
      onInput: (n) => { d.durationMin = Number.isFinite(n) && n > 0 ? Math.round(n) : null; app.save(); },
    });
    const save = async () => {
      if (d.rpe === null) { err.textContent = 'Pick your session effort first.'; return; }
      if (d.durationMin === null && elapsed > 90) {
        // A session left open (or resumed hours later) would log a misleading duration.
        err.textContent = `The timer says ${elapsed} min. Type how long the session really took.`;
        const input = durationInput.querySelector ? durationInput.querySelector('input') || durationInput : durationInput;
        input.focus();
        return;
      }
      if (p.done === 0) {
        close();
        const ok = await confirmSheet(app, { title: 'No sets ticked', text: 'Save this session with nothing logged?', confirmLabel: 'Save anyway' });
        if (!ok) return;
      }
      const today = app.today();
      const before = new Set(coachReview(app.state, today).suggestions.map((x) => x.key));
      const log = finishDraft(d, { nowMs: app.now().getTime(), id: newId('str') });
      app.save((x) => ({ ...x, strengthLogs: [...x.strengthLogs, log], draft: null }));
      const fresh = coachReview(app.state, today).suggestions.filter((x) => !before.has(x.key)).length;
      app.go('#/week');
      app.toast(`Session ${sessionId} saved.${fresh ? ` ${fresh} new coach suggestion${fresh > 1 ? 's' : ''}.` : ''}`,
        fresh ? { action: { label: 'View', run: () => app.go('#/coach') } } : undefined);
    };
    const discard = async () => {
      close();
      const ok = await confirmSheet(app, { title: 'Discard this session?', text: 'Everything you ticked in it will be lost.', confirmLabel: 'Discard', danger: true });
      if (ok) { app.save((x) => ({ ...x, draft: null })); app.go('#/log'); }
    };
    return h('div', null,
      h('p', { class: 'muted' }, `${p.done} of ${p.total} sets · ${elapsed} min`),
      group('Session effort', scaleChips({ min: 1, max: 10, value: d.rpe, label: 'Session effort', lowLabel: 'Very easy', highLabel: 'All-out', onChange: (v) => { d.rpe = v; app.save(); } }),
        'Aim for challenging but repeatable: about 6–8.'),
      field('Any pain or unusual symptoms?', h('textarea', { rows: '2', placeholder: 'Leave blank if none', oninput: (ev) => { d.pain = ev.target.value; app.save(); } }, d.pain), SAFETY_NOTE),
      field('Notes', h('textarea', { rows: '2', placeholder: 'Optional', oninput: (ev) => { d.notes = ev.target.value; app.save(); } }, d.notes)),
      field('Duration', durationInput, elapsed > 90 ? 'The timer ran long: type the real duration.' : 'Leave blank to use the timer.'),
      err,
      h('button', { class: 'btn strength block', type: 'button', onclick: save }, 'Save session'),
      h('div', { style: { height: '8px' } }),
      h('button', { class: 'btn ghost block', type: 'button', onclick: discard }, 'Discard session'));
  });
}

function logger(app, sessionId) {
  const d = app.state.draft;
  const prot = protectionFor(app, sessionId, d.date);
  const cfg = timerSettings(app);
  const next = upNext(d, cfg.flow);
  const p = draftProgress(d);
  const timer = h('span', { class: 'timer' });
  const tickTimer = () => { timer.textContent = `${elapsedMinutes(d, app.now().getTime())} min`; };
  tickTimer();
  const interval = setInterval(tickTimer, 20000);
  app.onLeave(() => clearInterval(interval));
  keepAwake(app);
  const onFinish = () => finishSheet(app, sessionId);

  const view = h('div', null,
    topbar(`Session ${sessionId}`, {
      sub: h('span', null, timer, ` · ${p.done} of ${p.total} sets`),
      back: () => app.go('#/log'),
      right: h('button', { class: 'btn small', type: 'button', onclick: onFinish }, 'Finish'),
    }),
    h('div', { class: 'content' },
      h('div', { class: 'progressbar', style: { margin: '0 0 12px' } }, h('i', { style: { width: `${p.total ? Math.round((p.done / p.total) * 100) : 0}%` } })),
      prot.applies ? h('div', { class: 'banner run' },
        h('div', { class: 'switch-row' },
          h('span', null, h('b', null, `Long run on ${prot.longDayName}. `), 'Lighter version on.'),
          toggle({ checked: d.runProtect, label: 'Use the lighter version', onChange: (on) => { app.state.draft = setRunProtect(d, app.state, on); app.save(); app.render(); } }))) : null,
      !prot.longRunSoon && prot.qualityTomorrow ? h('div', { class: 'banner run' }, `Quality run on ${prot.qualityDayName}: keep leg sets 2–3 reps short of failure.`) : null,
      d.energyBefore === null || p.done === 0 ? h('div', { class: 'card' },
        h('h3', null, 'Energy before you start'),
        scaleChips({ min: 1, max: 5, value: d.energyBefore, label: 'Energy before', lowLabel: 'Drained', highLabel: 'Great', onChange: (v) => { d.energyBefore = v; app.save(); } })) : null,
      h('details', { class: 'explain', open: p.done === 0 ? true : null }, h('summary', null, 'Warm-up · 5 min'), h('div', null, WARMUPS[sessionId])),
      h('div', { class: 'row between', style: { margin: '0 4px 10px' } },
        h('span', { class: 'small muted' }, `${FLOWS[cfg.flow]} · rest ${cfg.rest.short}/${cfg.rest.long} s`),
        h('button', { class: 'link', type: 'button', onclick: () => openTimerSettings(app) }, 'Change')),
      d.exercises.map((e, ei) => exerciseCard(app, e, ei, next)),
      h('details', { class: 'explain' }, h('summary', null, 'Cool-down · 4–5 min'), h('div', null, COOLDOWN)),
      h('button', { class: 'btn strength block', type: 'button', onclick: onFinish }, 'Finish session')),
    workoutDock(app, d, { onFinish }));

  // Keep the set the dock is offering in view, without fighting the user's own scrolling.
  if (next && app.lastNextRef !== `${next.ei}:${next.ri}`) {
    app.lastNextRef = `${next.ei}:${next.ri}`;
    const w = app.win;
    if (w.requestAnimationFrame) {
      w.requestAnimationFrame(() => {
        const row = view.querySelector(`[data-ref="${next.ei}:${next.ri}"]`);
        const dock = view.querySelector('.dock');
        if (!row || !row.isConnected) return;
        const r = row.getBoundingClientRect();
        const bottomLimit = w.innerHeight - (dock ? dock.getBoundingClientRect().height : 0) - 12;
        if (r.top < 70 || r.bottom > bottomLimit) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }
  return view;
}

function keepAwake(app) {
  const nav = app.win.navigator;
  if (!nav || !nav.wakeLock || !nav.wakeLock.request) return;
  let lock = null;
  let active = true;
  const request = async () => {
    try { lock = await nav.wakeLock.request('screen'); } catch (e) { lock = null; }
  };
  const onVis = () => { if (active && app.win.document.visibilityState === 'visible') request(); };
  request();
  app.win.document.addEventListener('visibilitychange', onVis);
  app.onLeave(() => {
    active = false;
    app.win.document.removeEventListener('visibilitychange', onVis);
    if (lock) lock.release().catch(() => {});
  });
}

export function strengthView(app) {
  const { sessionId } = app.route;
  const d = app.state.draft;
  if (d && d.sessionId !== sessionId) return conflict(app, sessionId);
  if (!d) return preview(app, sessionId);
  return logger(app, sessionId);
}
