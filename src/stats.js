// Series for the Progress charts. Every function returns plain arrays sorted oldest first.
import { addDays, weekStart } from './dates.js';
import { paceSecPerKm } from './pace.js';

const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const round1 = (x) => Math.round(x * 10) / 10;

export function exerciseSeries(state, exerciseId) {
  const out = [];
  for (const log of [...state.strengthLogs].sort(byDate)) {
    const e = (log.exercises || []).find((x) => x.exerciseId === exerciseId);
    if (!e || e.status === 'skipped' || !e.sets || !e.sets.length) continue;
    const values = e.sets.map((s) => Number(s.value) || 0);
    out.push({
      date: log.date,
      avg: round1(values.reduce((s, v) => s + v, 0) / values.length),
      best: Math.max(...values),
      sets: e.sets.length,
      variation: e.variation,
      unit: e.target ? e.target.unit : 'reps',
      logId: log.id,
    });
  }
  return out;
}

export function loggedExerciseIds(state) {
  const ids = new Set();
  for (const log of state.strengthLogs) for (const e of log.exercises || []) if (e.sets && e.sets.length) ids.add(e.exerciseId);
  return [...ids];
}

export function runPaceSeries(state) {
  return [...state.runLogs].sort(byDate)
    .map((r) => ({ date: r.date, pace: paceSecPerKm(r.distanceKm, r.durationSec), runType: r.runType, km: r.distanceKm, id: r.id }))
    .filter((r) => r.pace);
}

export function weeklyTotals(state, today, weeks = 8) {
  const thisWeek = weekStart(today);
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisWeek, -7 * i);
    const end = addDays(start, 6);
    const inWeek = (x) => x.date >= start && x.date <= end;
    const runs = state.runLogs.filter(inWeek);
    out.push({
      weekStart: start,
      km: round1(runs.reduce((s, r) => s + (Number(r.distanceKm) || 0), 0)),
      runs: runs.length,
      strength: state.strengthLogs.filter(inWeek).length,
    });
  }
  return out;
}

export function effortSeries(state) {
  return [...state.strengthLogs].sort(byDate)
    .filter((l) => typeof l.rpe === 'number')
    .map((l) => ({ date: l.date, rpe: l.rpe, sessionId: l.sessionId }));
}

export function benchmarkSeries(state, field) {
  return [...state.benchmarks].sort(byDate)
    .filter((b) => typeof b[field] === 'number' && Number.isFinite(b[field]))
    .map((b) => ({ date: b.date, value: b[field] }));
}
