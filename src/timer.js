// Workout flow and timers, as pure functions over the draft. Times are epoch milliseconds so a timer stays
// right when the phone locks or the app sits in the background.
//
// Flow 'circuit': one set of each exercise per round (the brief's "rest between rounds"); 'sets': all sets
// of one exercise before the next. Both sides of a set go back to back, with no rest between them.

export const FLOWS = { circuit: 'Circuit (rounds)', sets: 'One exercise at a time' };
export const REST_DEFAULTS = { short: 45, long: 75 };
export const HOLD_LEAD_IN_SEC = 3;

function active(draft) {
  return draft.exercises.map((e, ei) => ({ e, ei })).filter(({ e }) => e.status !== 'skipped');
}

// Every set row of the session in the order it will be done.
export function orderedRows(draft, flow) {
  const out = [];
  const exs = active(draft);
  if (flow === 'sets') {
    for (const { e, ei } of exs) e.rows.forEach((_, ri) => out.push({ ei, ri }));
    return out;
  }
  const maxSet = Math.max(0, ...exs.flatMap(({ e }) => e.rows.map((r) => r.set)));
  for (let set = 1; set <= maxSet; set++) {
    for (const { e, ei } of exs) e.rows.forEach((r, ri) => { if (r.set === set) out.push({ ei, ri }); });
  }
  return out;
}

export function nextUndone(draft, flow) {
  return orderedRows(draft, flow).find(({ ei, ri }) => !draft.exercises[ei].rows[ri].done) || null;
}

export function rowAt(draft, ref) {
  return ref ? draft.exercises[ref.ei].rows[ref.ri] : null;
}

// The next unfinished set after the one just done, wrapping round: ticking out of order carries on from
// where you are (the other side straight after, then the rest of the round or exercise).
export function nextAfter(draft, flow, done) {
  const order = orderedRows(draft, flow);
  const at = done ? order.findIndex((x) => x.ei === done.ei && x.ri === done.ri) : -1;
  if (at < 0) return nextUndone(draft, flow);
  for (let k = 1; k <= order.length; k++) {
    const x = order[(at + k) % order.length];
    if (!draft.exercises[x.ei].rows[x.ri].done) return x;
  }
  return null;
}

// What the dock offers next.
export function upNext(draft, flow) {
  return nextAfter(draft, flow, draft.lastDone || null);
}

// How long to rest after the set just done, or null when no rest is due (other side next, or all done).
export function restAfter(draft, flow, done, rest = REST_DEFAULTS) {
  const next = nextAfter(draft, flow, done);
  if (!next) return null;
  const a = rowAt(draft, done);
  const b = rowAt(draft, next);
  if (next.ei === done.ei && b.set === a.set) return null;
  if (flow === 'sets') return next.ei === done.ei ? { seconds: rest.long, kind: 'set' } : { seconds: rest.short, kind: 'exercise' };
  return b.set > a.set ? { seconds: rest.long, kind: 'round' } : { seconds: rest.short, kind: 'exercise' };
}

// Tick a set and start any rest that follows. Returns the rest started (or null). Mutates the draft.
export function completeSet(draft, ref, { flow, rest = REST_DEFAULTS, nowMs }) {
  const row = rowAt(draft, ref);
  row.done = true;
  draft.lastDone = ref;
  draft.hold = null;
  const r = restAfter(draft, flow, ref, rest);
  draft.rest = r ? { endsAt: nowMs + r.seconds * 1000, total: r.seconds, kind: r.kind } : null;
  return draft.rest;
}

export function adjustRest(draft, deltaSec, nowMs) {
  if (!draft.rest) return null;
  const endsAt = Math.max(nowMs, draft.rest.endsAt + deltaSec * 1000);
  draft.rest = { ...draft.rest, endsAt, total: Math.max(0, draft.rest.total + deltaSec) };
  return draft.rest;
}

export function endRest(draft) {
  draft.rest = null;
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
