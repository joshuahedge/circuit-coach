// Test builders: a set-up state and strength, run and check-in logs.
import { emptyState } from '../src/store.js';
import { createInitialPlan, currentPlan, sessionForToday } from '../src/plan.js';

export function setupState({ start = '2026-11-02', runDays = { mon: 'easy', wed: 'quality', sat: 'long' }, strengthDays = { tue: 'A', thu: 'B' } } = {}) {
  const s = emptyState(new Date(2026, 10, 2));
  s.setupDone = true;
  s.conventions = { lungeBaselinePerLeg: true, bridgeBaselinePerLeg: true };
  s.schedule = { runDays: { ...runDays }, strengthDays: { ...strengthDays } };
  s.block = { number: 1, startDate: start };
  s.plans = [createInitialPlan(start)];
  s.benchmarks = [{ id: 'b0', date: start, pressUps: 20, plankSec: 60, bridgeLeft: 5, bridgeRight: 5, squats: 20, lunges: 10, tenKSec: 3900, notes: 'Starting baseline' }];
  return s;
}

let seq = 0;

// opts.ex: per exercise { value: 'top' | 'min' | 'low' | number, rir, pain, sets }
export function addLog(state, sessionId, date, { ex = {}, value = 'min', rir = 1, rpe = 7, pain = '', runProtect = false, durationMin = 36 } = {}) {
  const plan = currentPlan(state);
  const session = sessionForToday(plan.sessions[sessionId], { runProtect });
  seq += 1;
  const exercises = session.exercises.map((p) => {
    const o = { value, rir, pain: false, ...(ex[p.exerciseId] || {}) };
    const v = o.value === 'top' ? p.max : o.value === 'min' ? p.min : o.value === 'low' ? p.min - 1 : o.value;
    const n = o.sets ?? p.sets;
    const sets = [];
    for (const side of p.sides || [null]) for (let i = 0; i < n; i++) sets.push({ side, value: v, rir: o.rir });
    return {
      exerciseId: p.exerciseId,
      variation: p.variation,
      target: { variation: p.variation, sets: p.sets, min: p.min, max: p.max, unit: p.unit, sides: p.sides, tempoDown: p.tempoDown, pause: p.pause },
      status: 'done', reason: '', pain: o.pain, sets,
    };
  });
  const log = {
    id: `${sessionId}-${date}-${seq}`, date, sessionId, planVersion: plan.version, createdAt: `${date}T18:00:${String(seq % 60).padStart(2, '0')}`,
    durationMin, runProtect, rpe, energyBefore: 4, pain, notes: '', exercises,
  };
  state.strengthLogs.push(log);
  return log;
}

export function addRun(state, date, { km = 5, sec = 1950, type = 'easy', rpe = 4, affected = false } = {}) {
  seq += 1;
  const run = { id: `run-${date}-${seq}`, date, distanceKm: km, durationSec: sec, runType: type, rpe, sorenessAffected: affected, notes: '' };
  state.runLogs.push(run);
  return run;
}

export function addCheckin(state, date, { energy = 4, sleep = 4, legSoreness = 1, pain = '' } = {}) {
  seq += 1;
  const c = { id: `chk-${date}-${seq}`, date, energy, sleep, legSoreness, pain };
  state.checkins.push(c);
  return c;
}
