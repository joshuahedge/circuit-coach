// The training plan: Sessions A and B as lists of prescriptions, kept as numbered plan versions.
// Functions here never mutate their inputs.
import { EXERCISES } from './library.js';

const SESSION_INFO = {
  A: { name: 'Session A', focus: 'Unilateral strength, push and trunk stability' },
  B: { name: 'Session B', focus: 'Tempo legs, shoulders, calves and lateral core' },
};

function rx(exerciseId, sets, min, max, extra = {}) {
  const ex = EXERCISES[exerciseId];
  return {
    exerciseId,
    variation: extra.variation || ex.name,
    sets,
    min,
    max,
    unit: ex.unit,
    sides: extra.sides !== undefined ? extra.sides : ex.sides,
    tempoDown: extra.tempoDown || 0,
    pause: extra.pause || 0,
    cue: extra.cue || ex.cues,
    legHeavy: ex.legHeavy,
    maxSets: extra.maxSets || 3,
    since: extra.since,
  };
}

export function defaultSessions(today) {
  const s = { since: today };
  return {
    A: {
      id: 'A', ...SESSION_INFO.A,
      exercises: [
        rx('reverse-lunge', 3, 8, 10, { ...s, tempoDown: 2, maxSets: 4 }),
        rx('press-up', 3, 8, 12, { ...s, tempoDown: 2, maxSets: 4 }),
        rx('sl-glute-bridge', 2, 5, 6, { ...s, tempoDown: 2, pause: 2, maxSets: 3 }),
        rx('prone-ytw', 2, 6, 8, { ...s, tempoDown: 2, maxSets: 3 }),
        rx('dead-bug', 3, 8, 10, { ...s, tempoDown: 2, maxSets: 4 }),
      ],
    },
    B: {
      id: 'B', ...SESSION_INFO.B,
      exercises: [
        rx('sl-rdl', 3, 8, 8, { ...s, tempoDown: 3, maxSets: 4 }),
        rx('tempo-squat', 3, 10, 12, { ...s, tempoDown: 3, pause: 1, maxSets: 4 }),
        rx('pike-push-up', 2, 6, 8, { ...s, tempoDown: 2, maxSets: 3, variation: 'Pike push-up' }),
        rx('sl-calf-raise', 3, 10, 12, { ...s, tempoDown: 3, pause: 1, maxSets: 4 }),
        rx('side-plank', 2, 25, 40, { ...s, maxSets: 3 }),
      ],
    },
  };
}

export function createInitialPlan(today) {
  return {
    version: 1,
    effectiveFrom: today,
    createdAt: today,
    reason: 'Starting plan from the brief',
    acceptedByUser: true,
    sessions: defaultSessions(today),
  };
}

export function currentPlan(state) {
  return state.plans[state.plans.length - 1];
}

// Sides to log for a version or swap, given the current prescription `from`. A version that sets its own
// (a two-legged swap, an archer press-up) uses them; moving off such a version goes back to the exercise's;
// otherwise the current sides stay, so a lunge logged "in total" stays that way.
export function sidesFor(exerciseId, variation, from = null) {
  const ex = EXERCISES[exerciseId];
  const own = (name) => [...ex.ladder, ...ex.swaps].find((x) => x.name === name && x.sides !== undefined);
  const to = own(variation);
  if (to) return to.sides;
  if (from && own(from.variation)) return ex.sides;
  return from ? from.sides : ex.sides;
}

export function sideCount(p) {
  return p.sides ? p.sides.length : 1;
}

export function rangeText(p) {
  return p.min === p.max ? `${p.min}` : `${p.min}–${p.max}`;
}

export function sideText(p) {
  if (!p.sides) return '';
  if (p.sides.length === 3) return ' each position';
  return p.legHeavy ? ' per leg' : ' per side';
}

export function prescriptionLabel(p) {
  const unit = p.unit === 'seconds' ? ' s' : '';
  return `${p.sets} × ${rangeText(p)}${unit}${sideText(p)}`;
}

export function tempoLabel(p) {
  const parts = [];
  if (p.tempoDown) parts.push(`${p.tempoDown} s down`);
  if (p.pause) parts.push(`${p.pause} s pause`);
  return parts.join(', ');
}

const WARM_COOL_MIN = 10;
const REST_SEC = 60;

function exerciseSeconds(p) {
  const mid = (p.min + p.max) / 2;
  const sides = sideCount(p);
  const work = p.unit === 'seconds'
    ? mid * sides + 10
    : mid * ((p.tempoDown || 0) + (p.pause || 0) + 1) * sides;
  return p.sets * (work + REST_SEC);
}

export function estimateMinutes(session) {
  const sec = session.exercises.reduce((sum, p) => sum + exerciseSeconds(p), 0);
  return Math.round(WARM_COOL_MIN + sec / 60);
}

function copySessions(sessions) {
  return {
    A: { ...sessions.A, exercises: sessions.A.exercises.map((p) => ({ ...p })) },
    B: { ...sessions.B, exercises: sessions.B.exercises.map((p) => ({ ...p })) },
  };
}

export function samePrescription(a, b) {
  const keys = ['exerciseId', 'variation', 'sets', 'min', 'max', 'unit', 'tempoDown', 'pause', 'maxSets'];
  return keys.every((k) => a[k] === b[k]) && JSON.stringify(a.sides) === JSON.stringify(b.sides);
}

export function withPrescription(plan, sessionId, exerciseId, p, { today, reason, acceptedByUser = true }) {
  const sessions = copySessions(plan.sessions);
  sessions[sessionId].exercises = sessions[sessionId].exercises.map((old) => (
    old.exerciseId === exerciseId ? { ...p, since: today } : old));
  return { version: plan.version + 1, effectiveFrom: today, createdAt: today, reason, acceptedByUser, sessions };
}

export function revertPlan(state, version, today) {
  const target = state.plans.find((p) => p.version === version);
  const current = currentPlan(state);
  const sessions = copySessions(target.sessions);
  for (const id of ['A', 'B']) {
    sessions[id].exercises = sessions[id].exercises.map((p) => {
      const now = current.sessions[id].exercises.find((c) => c.exerciseId === p.exerciseId);
      return now && samePrescription(now, p) ? { ...p, since: now.since } : { ...p, since: today };
    });
  }
  return {
    version: current.version + 1, effectiveFrom: today, createdAt: today,
    reason: `Went back to version ${version}`, acceptedByUser: true, sessions,
  };
}

export function ladderIndex(p) {
  const ex = EXERCISES[p.exerciseId];
  return ex ? ex.ladder.findIndex((l) => l.name === p.variation) : -1;
}
