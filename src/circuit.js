// The circuit editor's rules, as pure functions: what a session covers, what to add to fill a gap, what you
// may add, and a plain-English summary of an edit (the plan version's reason).
import { AREAS, EXERCISES, exerciseById, isBannedName } from './library.js';
import { estimateMinutes, prescriptionLabel, samePrescription, targetMinutes } from './plan.js';

const LABEL = Object.fromEntries(AREAS.map((a) => [a.id, a.label.toLowerCase()]));

export function areasCovered(session) {
  const out = new Set();
  for (const p of session.exercises) {
    const ex = exerciseById(p.exerciseId);
    if (ex && ex.area) out.add(ex.area);
  }
  return out;
}

// Areas with nothing in this session, each with up to two built-in exercises to fill it: ones in neither
// session first, in the library's own order.
export function balanceGaps(plan, sessionId, session = plan.sessions[sessionId]) {
  const covered = areasCovered(session);
  const here = new Set(session.exercises.map((p) => p.exerciseId));
  const elsewhere = new Set(Object.entries(plan.sessions).filter(([id]) => id !== sessionId)
    .flatMap(([, s]) => s.exercises.map((p) => p.exerciseId)));
  return AREAS.filter((a) => !covered.has(a.id)).map((a) => {
    const pool = Object.values(EXERCISES).filter((ex) => ex.area === a.id && !here.has(ex.id));
    const ideas = [...pool.filter((ex) => !elsewhere.has(ex.id)), ...pool.filter((ex) => elsewhere.has(ex.id))].slice(0, 2);
    return { area: a.id, label: a.label, text: `No ${LABEL[a.id]} work in this session.`, ideas };
  });
}

export function timeCheck(session) {
  const minutes = estimateMinutes(session);
  const target = targetMinutes(session);
  return { minutes, target, over: minutes > target };
}

// Checks for your own exercise before it is saved. Returns an error message, or '' when it is fine.
export function ownExerciseProblem({ name, unit, min, max, sets }, existing = []) {
  const n = String(name || '').trim();
  if (!n) return 'Give it a name.';
  if (n.length > 40) return 'Keep the name to 40 characters.';
  if (isBannedName(n)) return 'Your brief rules out burpees and mountain climbers.';
  const builtIn = Object.values(EXERCISES).find((ex) => ex.name.toLowerCase() === n.toLowerCase());
  if (builtIn) return `${builtIn.name} is already built in, with steps and harder versions: add that one instead.`;
  if (existing.some((c) => c.name.toLowerCase() === n.toLowerCase())) return 'You already have an exercise with that name.';
  if (!['reps', 'seconds'].includes(unit)) return 'Choose reps or seconds.';
  if (!(sets >= 1 && min >= 1 && max >= min)) return 'The bottom of the range must not be above the top.';
  return '';
}

// "added Wall sit; removed Dead bug; changed Press-up (3 × 10–14); new order; target 50 min"
export function editSummary(before, after) {
  const name = (p) => p.variation;
  const was = new Map(before.exercises.map((p) => [p.exerciseId, p]));
  const now = new Map(after.exercises.map((p) => [p.exerciseId, p]));
  const parts = [];
  const added = after.exercises.filter((p) => !was.has(p.exerciseId)).map(name);
  const removed = before.exercises.filter((p) => !now.has(p.exerciseId)).map(name);
  const changed = after.exercises.filter((p) => was.has(p.exerciseId) && !samePrescription(was.get(p.exerciseId), p))
    .map((p) => `${name(p)} (${prescriptionLabel(p)})`);
  if (added.length) parts.push(`added ${added.join(', ')}`);
  if (removed.length) parts.push(`removed ${removed.join(', ')}`);
  if (changed.length) parts.push(`changed ${changed.join(', ')}`);
  const order = (s, keep) => s.exercises.map((p) => p.exerciseId).filter((id) => keep.has(id)).join(',');
  if (order(before, now) !== order(after, was)) parts.push('new order');
  if (targetMinutes(before) !== targetMinutes(after)) parts.push(`target ${targetMinutes(after)} min`);
  return parts.join('; ');
}

export function sessionChanged(before, after) {
  return editSummary(before, after) !== '';
}
