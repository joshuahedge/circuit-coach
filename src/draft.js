// The strength session being logged. It lives in state.draft and is saved on every tap, so closing the app
// mid-workout loses nothing. finishDraft turns it into a strength log.
import { currentPlan, sessionForToday } from './plan.js';

export function targetOf(p) {
  return { variation: p.variation, sets: p.sets, min: p.min, max: p.max, unit: p.unit, sides: p.sides, tempoDown: p.tempoDown, pause: p.pause, legHeavy: p.legHeavy };
}

// Values from the most recent log of this exercise in the same variation and unit, by set and side.
function lastValues(state, sessionId, p) {
  const logs = state.strengthLogs.filter((l) => l.sessionId === sessionId)
    .sort((a, b) => (a.date === b.date ? String(a.createdAt).localeCompare(String(b.createdAt)) : a.date < b.date ? -1 : 1));
  for (let i = logs.length - 1; i >= 0; i--) {
    const e = logs[i].exercises.find((x) => x.exerciseId === p.exerciseId);
    if (!e || !e.sets || !e.sets.length || e.variation !== p.variation || (e.target && e.target.unit !== p.unit)) continue;
    const map = new Map();
    const perSide = {};
    for (const s of e.sets) {
      perSide[s.side] = (perSide[s.side] || 0) + 1;
      const setNo = s.set || perSide[s.side];
      map.set(`${setNo}:${s.side}`, s.value);
      map.set(`any:${s.side}`, s.value);
    }
    return map;
  }
  return new Map();
}

function buildRows(p, last, keep = []) {
  const rows = [];
  for (let set = 1; set <= p.sets; set++) {
    for (const side of p.sides || [null]) {
      const kept = keep.find((r) => r.set === set && r.side === side);
      if (kept) { rows.push(kept); continue; }
      const prevRow = [...keep, ...rows].filter((r) => r.side === side).pop();
      const lastVal = last.get(`${set}:${side}`) ?? last.get(`any:${side}`) ?? (prevRow ? prevRow.last : null) ?? null;
      // Reps start at last time's number or the bottom of the range, whichever is higher, so a tick without
      // adjusting never feeds the coach a below-target set. Holds start at the bottom: the timer fills them.
      const value = p.unit === 'seconds' ? p.min : Math.max(lastVal ?? p.min, p.min);
      rows.push({ set, side, value, last: lastVal, rir: null, done: false });
    }
  }
  return rows;
}

export function createDraft(state, sessionId, today, { runProtect = false, nowIso = new Date().toISOString() } = {}) {
  const plan = currentPlan(state);
  const session = sessionForToday(plan.sessions[sessionId], { runProtect });
  const checkin = state.checkins.find((c) => c.date === today);
  return {
    sessionId,
    date: today,
    startedAt: nowIso,
    planVersion: plan.version,
    runProtect,
    energyBefore: checkin && typeof checkin.energy === 'number' ? checkin.energy : null,
    rpe: null,
    pain: '',
    notes: '',
    durationMin: null,
    exercises: session.exercises.map((p) => ({
      exerciseId: p.exerciseId,
      variation: p.variation,
      target: targetOf(p),
      status: 'pending',
      reason: '',
      pain: false,
      rows: buildRows(p, lastValues(state, sessionId, p)),
    })),
  };
}

// Reopen a saved session for editing. Saving replaces the log; discarding leaves it untouched.
export function draftFromLog(log) {
  return {
    sessionId: log.sessionId,
    date: log.date,
    startedAt: log.createdAt,
    planVersion: log.planVersion,
    runProtect: Boolean(log.runProtect),
    energyBefore: log.energyBefore ?? null,
    rpe: log.rpe ?? null,
    pain: log.pain || '',
    notes: log.notes || '',
    durationMin: log.durationMin ?? null,
    editingId: log.id,
    editingCreatedAt: log.createdAt,
    warmup: { done: true },
    exercises: log.exercises.map((e) => {
      const t = e.target;
      const rows = [];
      for (let set = 1; set <= t.sets; set++) {
        for (const side of t.sides || [null]) {
          const saved = e.sets.find((s) => (s.set || 0) === set && s.side === side);
          rows.push(saved
            ? { set, side, value: saved.value, last: null, rir: saved.rir ?? null, done: true }
            : { set, side, value: t.min, last: null, rir: null, done: false });
        }
      }
      return {
        exerciseId: e.exerciseId, variation: e.variation, target: t,
        status: e.status === 'done' ? 'pending' : e.status, reason: e.status === 'done' ? '' : e.reason, pain: Boolean(e.pain), rows,
      };
    }),
  };
}

export function setRunProtect(draft, state, on) {
  const plan = state.plans.find((p) => p.version === draft.planVersion) || currentPlan(state);
  const session = sessionForToday(plan.sessions[draft.sessionId], { runProtect: on });
  return {
    ...draft,
    runProtect: on,
    exercises: draft.exercises.map((e) => {
      const p = session.exercises.find((x) => x.exerciseId === e.exerciseId);
      if (!p || p.sets === e.target.sets) return e;
      const keep = e.rows.filter((r) => r.set <= p.sets);
      return { ...e, target: { ...e.target, sets: p.sets }, rows: buildRows({ ...p, variation: e.variation }, new Map(), keep) };
    }),
  };
}

export function elapsedMinutes(draft, nowMs) {
  const start = Date.parse(draft.startedAt);
  if (!Number.isFinite(start)) return 0;
  return Math.max(1, Math.round((nowMs - start) / 60000));
}

export function finishDraft(draft, { nowMs = Date.now(), id }) {
  const durationMin = draft.durationMin ?? Math.min(elapsedMinutes(draft, nowMs), 999);
  return {
    id: draft.editingId || id,
    date: draft.date,
    sessionId: draft.sessionId,
    planVersion: draft.planVersion,
    createdAt: draft.editingCreatedAt || new Date(nowMs).toISOString(),
    durationMin,
    runProtect: draft.runProtect,
    rpe: draft.rpe,
    energyBefore: draft.energyBefore,
    pain: draft.pain.trim(),
    notes: draft.notes.trim(),
    exercises: draft.exercises.map((e) => {
      const sets = e.rows.filter((r) => r.done).map((r) => ({ set: r.set, side: r.side, value: r.value, rir: r.rir }));
      let status = e.status;
      if (status === 'pending') status = sets.length ? 'done' : 'skipped';
      const reason = status === 'skipped' && !e.reason ? 'Not done' : e.reason;
      return {
        exerciseId: e.exerciseId, variation: e.variation, target: e.target, status, reason, pain: e.pain,
        sets: status === 'skipped' ? [] : sets,
      };
    }),
  };
}

export function draftProgress(draft) {
  const rows = draft.exercises.filter((e) => e.status !== 'skipped').flatMap((e) => e.rows);
  return { done: rows.filter((r) => r.done).length, total: rows.length };
}
