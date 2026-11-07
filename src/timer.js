// Workout flow and timers, as pure functions over the draft. Times are epoch milliseconds so a timer stays
// right when the phone locks or the app sits in the background.
//
import { startGuide } from './guide.js';

// Sessions run as circuits: one set of each exercise per round (the brief's "rest between rounds"). Both
// sides of a set go back to back, with no rest between them.
export const REST_DEFAULTS = { short: 45, long: 75 };
export const HOLD_LEAD_IN_SEC = 3;
export const SWITCH_SIDES_SEC = 5;

function active(draft) {
  return draft.exercises.map((e, ei) => ({ e, ei })).filter(({ e }) => e.status !== 'skipped');
}

// Every set row of the session in the order it will be done, round by round.
export function orderedRows(draft) {
  const out = [];
  const exs = active(draft);
  const maxSet = Math.max(0, ...exs.flatMap(({ e }) => e.rows.map((r) => r.set)));
  for (let set = 1; set <= maxSet; set++) {
    for (const { e, ei } of exs) e.rows.forEach((r, ri) => { if (r.set === set) out.push({ ei, ri }); });
  }
  return out;
}

export function nextUndone(draft) {
  return orderedRows(draft).find(({ ei, ri }) => !draft.exercises[ei].rows[ri].done) || null;
}

export function rowAt(draft, ref) {
  return ref ? draft.exercises[ref.ei].rows[ref.ri] : null;
}

// The next unfinished set after the one just done, wrapping round: ticking out of order carries on from
// where you are (the other side straight after, then the rest of the round or exercise).
export function nextAfter(draft, done) {
  const order = orderedRows(draft);
  const at = done ? order.findIndex((x) => x.ei === done.ei && x.ri === done.ri) : -1;
  if (at < 0) return nextUndone(draft);
  for (let k = 1; k <= order.length; k++) {
    const x = order[(at + k) % order.length];
    if (!draft.exercises[x.ei].rows[x.ri].done) return x;
  }
  return null;
}

// What the dock offers next.
export function upNext(draft) {
  return nextAfter(draft, draft.lastDone || null);
}

// How long to rest after the set just done, or null when no rest is due (other side next, or all done).
export function restAfter(draft, done, rest = REST_DEFAULTS) {
  const next = nextAfter(draft, done);
  if (!next) return null;
  const a = rowAt(draft, done);
  const b = rowAt(draft, next);
  if (next.ei === done.ei && b.set === a.set) {
    // Other side next: straight on for reps, a few seconds to get into position for a hold.
    return draft.exercises[done.ei].target.unit === 'seconds' ? { seconds: SWITCH_SIDES_SEC, kind: 'switch' } : null;
  }
  return b.set > a.set ? { seconds: rest.long, kind: 'round' } : { seconds: rest.short, kind: 'exercise' };
}

// Tick a set and start any rest that follows. Returns the rest started (or null). Mutates the draft.
export function completeSet(draft, ref, { rest = REST_DEFAULTS, nowMs }) {
  const row = rowAt(draft, ref);
  row.done = true;
  draft.lastDone = ref;
  draft.hold = null;
  draft.restEndedAt = null;
  if (!draft.warmup || !draft.warmup.done) draft.warmup = { done: true };
  const r = restAfter(draft, ref, rest);
  draft.rest = r ? { endsAt: nowMs + r.seconds * 1000, total: r.seconds, kind: r.kind } : null;
  return draft.rest;
}

export function adjustRest(draft, deltaSec, nowMs) {
  if (!draft.rest) return null;
  const endsAt = Math.max(nowMs, draft.rest.endsAt + deltaSec * 1000);
  draft.rest = { ...draft.rest, endsAt, total: Math.max(0, draft.rest.total + deltaSec) };
  return draft.rest;
}

// natural: the countdown reached zero (remember when, to show how long ago); otherwise skipped.
export function endRest(draft, natural = false) {
  draft.restEndedAt = natural && draft.rest ? draft.rest.endsAt : null;
  draft.rest = null;
}

// Guided warm-up and cool-down: each holds a guide (see guide.js) while running, then { done: true }.
export function startWarmup(draft, nowMs, steps) {
  draft.warmup = { guide: startGuide(steps, nowMs) };
}

export function startCooldown(draft, nowMs, steps) {
  draft.cooldown = { guide: startGuide(steps, nowMs) };
}

export function endCooldown(draft) {
  draft.cooldown = { done: true };
}

export function endWarmup(draft) {
  draft.warmup = { done: true };
}

export function remainingSec(endsAt, nowMs) {
  return Math.max(0, Math.ceil((endsAt - nowMs) / 1000));
}

// Hold timer: a short lead-in, then it counts up. Stopping logs the seconds held and completes the set.
export function startHold(draft, ref, nowMs) {
  draft.rest = null;
  draft.hold = { ...ref, startsAt: nowMs + HOLD_LEAD_IN_SEC * 1000 };
  return draft.hold;
}

export function holdElapsed(hold, nowMs) {
  return Math.max(0, Math.floor((nowMs - hold.startsAt) / 1000));
}

export function stopHold(draft, opts) {
  const h = draft.hold;
  if (!h) return null;
  const ref = { ei: h.ei, ri: h.ri };
  const secs = holdElapsed(h, opts.nowMs);
  draft.hold = null;
  if (secs <= 0) return null;
  rowAt(draft, ref).value = secs;
  return completeSet(draft, ref, opts);
}

export function cancelHold(draft) {
  draft.hold = null;
}

export function clock(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// "Set 2 of 3 · Left" for the dock label.
export function setLabel(draft, ref) {
  const e = draft.exercises[ref.ei];
  const row = rowAt(draft, ref);
  const sideNames = { L: 'Left', R: 'Right', Y: 'Y', T: 'T', W: 'W' };
  return `Set ${row.set} of ${e.target.sets}${row.side ? ` · ${sideNames[row.side] || row.side}` : ''}`;
}
