// The "Now" dock at the bottom of a workout: warm-up, then the next set with big controls, the rest
// countdown, the hold timer for timed exercises, and Finish when every set is done. Thumb reach, one tap a set.
import { h, append, ICONS, stepper, chips, group, toggle } from './dom.js';
import { openSheet } from './sheet.js';
import {
  upNext, rowAt, completeSet, adjustRest, endRest, remainingSec, startHold, holdElapsed, stopHold, cancelHold,
  clock, setLabel, startWarmup, endWarmup, FLOWS, REST_DEFAULTS, HOLD_LEAD_IN_SEC,
} from '../timer.js';
import { sideText, tempoLabel } from '../plan.js';
import { draftProgress } from '../draft.js';
import { beep, unlockSound, applyAudioSession } from './sound.js';

export function timerSettings(app) {
  const s = app.state.settings || {};
  return {
    flow: s.flow === 'sets' ? 'sets' : 'circuit',
    rest: { short: s.restShort || REST_DEFAULTS.short, long: s.restLong || REST_DEFAULTS.long },
    sound: s.sound !== false,
    throughSilent: Boolean(s.soundThroughSilent),
  };
}

export function openTimerSettings(app) {
  const save = (patch) => app.save((x) => ({ ...x, settings: { ...x.settings, ...patch } }));
  openSheet(app, 'Order and rest', (close) => {
    const body = h('div');
    const draw = () => {
      const cfg = timerSettings(app);
      const longLabel = cfg.flow === 'circuit' ? 'Rest between rounds' : 'Rest between sets';
      body.replaceChildren(
        group('Order', chips({
          options: Object.entries(FLOWS).map(([value, label]) => ({ value, label })), value: cfg.flow, label: 'Order',
          onChange: (v) => { save({ flow: v }); draw(); },
        }), cfg.flow === 'circuit' ? 'One set of each exercise, then the next round. Both sides back to back.' : 'All sets of one exercise, then the next.'),
        group('Rest between exercises', chips({
          options: [30, 45, 60].map((n) => ({ value: n, label: `${n} s` })), value: cfg.rest.short, label: 'Rest between exercises',
          onChange: (v) => { save({ restShort: v }); },
        })),
        group(longLabel, chips({
          options: [60, 75, 90, 120].map((n) => ({ value: n, label: `${n} s` })), value: cfg.rest.long, label: longLabel,
          onChange: (v) => { save({ restLong: v }); },
        }), 'The brief: 30–60 s between exercises, 60–90 s between rounds. Rest enough to keep technique strong.'),
        h('div', { class: 'switch-row' },
          h('span', null, h('b', null, 'Beeps')),
          toggle({ checked: cfg.sound, label: 'Beeps', onChange: (on) => { save({ sound: on }); if (on) unlockSound(app.win); } })),
        h('div', { class: 'switch-row' },
          h('span', null, h('b', null, 'Beep on silent'), h('div', { class: 'small muted' }, 'Plays through the iPhone silent switch. It may pause music while the app is open.')),
          toggle({ checked: cfg.throughSilent, label: 'Beep on silent', onChange: (on) => { save({ soundThroughSilent: on }); applyAudioSession(app); } })),
        h('button', { class: 'btn block', type: 'button', style: { marginTop: '8px' }, onclick: () => { unlockSound(app.win); applyAudioSession(app); beep(app, 'go'); } }, 'Test the beep'),
        h('p', { class: 'small muted' }, 'Beeps play only while the app is open on screen; the screen stays on during a workout. The countdown and a colour flash are always there too.'),
        h('button', { class: 'btn primary block', type: 'button', style: { marginTop: '4px' }, onclick: () => { close(); app.render(); } }, 'Done'));
    };
    draw();
    return body;
  });
}

const KIND_TEXT = { exercise: 'before the next exercise', round: 'before the next round', set: 'before the next set', switch: 'switch sides' };

function targetText(t) {
  const range = t.min === t.max ? `${t.min}` : `${t.min}–${t.max}`;
  const unit = t.unit === 'seconds' ? ' s' : ' reps';
  const tempo = tempoLabel(t);
  return `${range}${unit}${sideText(t)}${tempo ? ` · ${tempo}` : ''}`;
}

export function workoutDock(app, d, { onFinish, warmupText = '' }) {
  const cfg = timerSettings(app);
  const now = () => app.now().getTime();
  const el = h('div', { class: 'dock', role: 'region', 'aria-label': 'Next set and timer' });
  const put = (...kids) => append(el, kids); // skips nulls (native append would print "null")
  if (app.dockFlash) { el.classList.add('flash'); app.dockFlash = false; }
  const gear = h('button', { class: 'dock-gear', type: 'button', 'aria-label': 'Order and rest settings', onclick: () => openTimerSettings(app) }, 'Rest');
  let tick = () => {};
  let lastCount = null;
  const unlock = () => { unlockSound(app.win); applyAudioSession(app); };

  const complete = (ref) => {
    unlock();
    completeSet(d, ref, { flow: cfg.flow, rest: cfg.rest, nowMs: now() });
    app.save();
    app.render();
  };

  const nextText = () => {
    const ref = upNext(d, cfg.flow);
    return ref ? `Next: ${d.exercises[ref.ei].variation} · ${setLabel(d, ref)}` : 'Next: finish the session';
  };

  function warmupMode() {
    const running = d.warmup && d.warmup.endsAt;
    if (!running) {
      put(
        h('div', { class: 'dock-head' },
          h('div', { class: 'grow' }, h('div', { class: 'dock-title' }, 'Warm-up · 5 min'), h('div', { class: 'dock-sub clamp' }, warmupText)),
          gear),
        h('div', { class: 'dock-row' },
          h('button', { class: 'btn dock-btn', type: 'button', onclick: () => { endWarmup(d); app.save(); app.render(); } }, 'Skip'),
          h('button', { class: 'btn primary dock-btn grow', type: 'button', onclick: () => { unlock(); startWarmup(d, now()); app.save(); app.render(); } }, 'Start warm-up timer')));
      return;
    }
    const clockEl = h('div', { class: 'dock-clock' });
    put(
      h('div', { class: 'dock-head' },
        h('div', { class: 'grow' }, h('div', { class: 'dock-title' }, 'Warm-up'), h('div', { class: 'dock-sub clamp' }, warmupText)),
        clockEl),
      h('div', { class: 'dock-row' },
        h('button', { class: 'btn primary dock-btn grow', type: 'button', onclick: () => { endWarmup(d); app.save(); app.render(); } }, 'Warmed up: first set')));
    tick = () => {
      const rem = remainingSec(d.warmup.endsAt, now());
      clockEl.textContent = clock(rem);
      if (rem === 0) { beep(app, 'go'); endWarmup(d); app.save(); app.dockFlash = true; app.render(); }
    };
  }

  function setMode(ref) {
    const e = d.exercises[ref.ei];
    const row = rowAt(d, ref);
    const t = e.target;
    const isSec = t.unit === 'seconds';
    const over = h('div', { class: 'dock-over' });
    put(
      h('div', { class: 'dock-head' },
        h('div', { class: 'grow' },
          h('div', { class: 'dock-title' }, e.variation),
          h('div', { class: 'dock-target' }, targetText(t)),
          h('div', { class: 'dock-sub' }, setLabel(d, ref), !isSec && row.last != null ? ` · last time ${row.last}` : '')),
        gear),
      over,
      // Timed exercises: the hold timer is the main action; typing the seconds is the fallback.
      isSec ? h('button', {
        class: 'btn primary dock-btn block', type: 'button', style: { marginBottom: '8px' },
        onclick: () => { unlock(); startHold(d, ref, now()); app.save(); app.render(); },
      }, 'Start the hold timer') : null,
      h('div', { class: 'dock-row' },
        stepper({
          value: row.value, min: 0, max: isSec ? 600 : 200, step: isSec ? 5 : 1, label: `${e.variation}, ${setLabel(d, ref)}`,
          onChange: (v) => { row.value = v; app.save(); },
        }),
        h('button', { class: `btn ${isSec ? '' : 'primary '}dock-btn grow`, type: 'button', 'aria-label': `Done: ${e.variation}, ${setLabel(d, ref)}`, onclick: () => complete(ref) },
          h('span', { 'aria-hidden': 'true', html: ICONS.check }), isSec ? 'Log it' : 'Done')));
    tick = () => {
      if (!d.restEndedAt) return;
      const ago = Math.floor((now() - d.restEndedAt) / 1000);
      over.textContent = ago >= 0 && ago < 300 ? `Rest ended ${clock(ago)} ago` : '';
    };
  }

  function restMode() {
    const r = d.rest;
    const clockEl = h('div', { class: 'dock-clock' }, clock(remainingSec(r.endsAt, now())));
    const bar = h('i');
    const last = d.lastDone ? rowAt(d, d.lastDone) : null;
    const lastEx = d.lastDone ? d.exercises[d.lastDone.ei] : null;
    const setRir = (v) => {
      if (!lastEx) return;
      lastEx.rows.forEach((row) => { if (row.set === last.set && row.done) row.rir = v; });
      app.save();
    };
    put(
      h('div', { class: 'dock-head' },
        h('div', { class: 'grow' },
          h('div', { class: 'dock-title' }, r.kind === 'switch' ? 'Switch sides' : 'Rest'),
          h('div', { class: 'dock-sub' }, r.kind === 'switch' ? 'Get into position' : KIND_TEXT[r.kind] || '')),
        clockEl),
      h('div', { class: 'progressbar dock-bar' }, bar),
      h('div', { class: 'dock-row' },
        h('button', { class: 'btn dock-btn', type: 'button', 'aria-label': '15 seconds less', onclick: () => { adjustRest(d, -15, now()); app.save(); tick(); } }, '−15'),
        h('button', { class: 'btn dock-btn', type: 'button', 'aria-label': '15 seconds more', onclick: () => { adjustRest(d, 15, now()); app.save(); tick(); } }, '+15'),
        h('button', { class: 'btn primary dock-btn grow', type: 'button', onclick: () => { endRest(d); app.save(); app.render(); } }, r.kind === 'switch' ? 'Ready' : 'Skip rest')),
      lastEx && lastEx.target.unit === 'reps' && r.kind !== 'switch' ? h('div', { class: 'dock-rir' },
        h('span', { class: 'dock-sub' }, 'Reps left in the tank?'),
        chips({
          options: [0, 1, 2, 3, 4].map((n) => ({ value: n, label: n === 4 ? '4+' : String(n) })),
          value: last.rir ?? null, allowClear: true, label: 'Reps in reserve on that set', onChange: setRir,
        })) : null,
      h('div', { class: 'dock-next' }, nextText()));
    tick = () => {
      const rem = remainingSec(d.rest.endsAt, now());
      clockEl.textContent = clock(rem);
      bar.style.width = `${d.rest.total ? Math.min(100, (rem / d.rest.total) * 100) : 0}%`;
      if (rem > 0 && rem <= 3 && lastCount !== rem) { lastCount = rem; beep(app, 'count'); }
      if (rem === 0) {
        beep(app, 'go');
        endRest(d, true);
        app.save();
        app.dockFlash = true;
        app.render();
      }
    };
  }

  function holdMode() {
    const hd = d.hold;
    const e = d.exercises[hd.ei];
    const t = e.target;
    const clockEl = h('div', { class: 'dock-clock big' });
    const sub = h('div', { class: 'dock-sub' });
    const stop = h('button', {
      class: 'btn primary dock-btn grow', type: 'button',
      onclick: () => {
        const started = now() >= d.hold.startsAt;
        stopHold(d, { flow: cfg.flow, rest: cfg.rest, nowMs: now() });
        app.save();
        if (!started) app.toast('Stopped before the hold started: nothing logged.');
        app.render();
      },
    }, 'Stop');
    put(
      h('div', { class: 'dock-head' },
        h('div', { class: 'grow' }, h('div', { class: 'dock-title' }, `${e.variation} · ${setLabel(d, hd)}`), sub),
        clockEl),
      h('div', { class: 'dock-row' },
        h('button', { class: 'btn dock-btn', type: 'button', onclick: () => { cancelHold(d); app.save(); app.render(); } }, 'Cancel'),
        stop));
    let cue = null;
    lastCount = HOLD_LEAD_IN_SEC + 1;
    tick = () => {
      const ms = d.hold.startsAt - now();
      if (ms > 0) {
        const n = Math.ceil(ms / 1000);
        clockEl.textContent = String(n);
        sub.textContent = 'Get into position…';
        if (lastCount !== n) { lastCount = n; beep(app, 'count'); }
        return;
      }
      const secs = holdElapsed(d.hold, now());
      clockEl.textContent = clock(secs);
      sub.textContent = secs < t.min ? `Hold to ${t.min} s (target ${t.min}–${t.max} s)` : secs < t.max ? `In range · up to ${t.max} s` : 'Top of the range: stop when form slips';
      if (cue === null) { cue = 'go'; beep(app, 'go'); }
      if (secs >= t.min && cue === 'go') { cue = 'min'; beep(app, 'target'); }
      if (secs >= t.max && cue === 'min') { cue = 'max'; beep(app, 'target'); }
    };
  }

  function doneMode() {
    put(
      h('div', { class: 'dock-head' },
        h('div', { class: 'grow' }, h('div', { class: 'dock-title' }, 'Every set done'), h('div', { class: 'dock-sub' }, 'Cool down, then save the session.')),
        gear),
      h('div', { class: 'dock-row' }, h('button', { class: 'btn strength dock-btn grow', type: 'button', onclick: onFinish }, 'Finish session')));
  }

  const fresh = draftProgress(d).done === 0 && !d.editingId;
  if (d.hold) holdMode();
  else if (d.rest && remainingSec(d.rest.endsAt, now()) > 0) restMode();
  else if (fresh && (!d.warmup || (d.warmup.endsAt && remainingSec(d.warmup.endsAt, now()) > 0))) warmupMode();
  else {
    if (d.rest) { endRest(d, true); app.save(); }
    if (fresh && d.warmup && d.warmup.endsAt) { endWarmup(d); app.save(); }
    const ref = upNext(d, cfg.flow);
    if (ref) setMode(ref); else doneMode();
  }
  tick();
  const interval = setInterval(() => tick(), 250);
  app.onLeave(() => clearInterval(interval));
  return el;
}
