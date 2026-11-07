import { describe, it, expect } from './harness.js';
import { exerciseSeries, runPaceSeries, weeklyTotals, effortSeries, benchmarkSeries, loggedExerciseIds } from '../src/stats.js';
import { buildSummary } from '../src/summary.js';
import { setupState, addLog, addRun, addCheckin } from './fixtures.js';

describe('stats', () => {
  it('exercise series averages every set and side', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-05', { ex: { 'reverse-lunge': { value: 9 } } });
    addLog(s, 'A', '2026-11-03', { ex: { 'reverse-lunge': { value: 8 } } });
    const series = exerciseSeries(s, 'reverse-lunge');
    expect(series.map((x) => x.date)).toEqual(['2026-11-03', '2026-11-05']);
    expect(series[1].avg).toBe(9);
    expect(series[1].sets).toBe(6);
    expect(loggedExerciseIds(s).includes('dead-bug')).toBe(true);
  });

  it('skipped exercises are left out', () => {
    const s = setupState();
    const log = addLog(s, 'A', '2026-11-03');
    log.exercises[1].status = 'skipped';
    log.exercises[1].sets = [];
    expect(exerciseSeries(s, 'press-up').length).toBe(0);
  });

  it('pace series by run', () => {
    const s = setupState();
    addRun(s, '2026-11-04', { km: 10, sec: 3900, type: 'long' });
    addRun(s, '2026-11-02', { km: 5, sec: 1800, type: 'easy' });
    const p = runPaceSeries(s);
    expect(p.map((x) => x.pace)).toEqual([360, 390]);
    expect(p[1].runType).toBe('long');
  });

  it('weekly totals over 8 weeks with empty weeks', () => {
    const s = setupState();
    addRun(s, '2026-11-02', { km: 5 });
    addRun(s, '2026-11-07', { km: 10.25 });
    addLog(s, 'A', '2026-11-03');
    const w = weeklyTotals(s, '2026-11-12');
    expect(w.length).toBe(8);
    expect(w[7].weekStart).toBe('2026-11-09');
    expect(w[6]).toEqual({ weekStart: '2026-11-02', km: 15.3, runs: 2, strength: 1 });
    expect(w[0].km).toBe(0);
  });

  it('effort and benchmark series', () => {
    const s = setupState();
    addLog(s, 'B', '2026-11-05', { rpe: 8 });
    expect(effortSeries(s)).toEqual([{ date: '2026-11-05', rpe: 8, sessionId: 'B' }]);
    s.benchmarks.push({ id: 'b1', date: '2026-12-01', pressUps: 24, tenKSec: null });
    expect(benchmarkSeries(s, 'pressUps').map((x) => x.value)).toEqual([20, 24]);
    expect(benchmarkSeries(s, 'tenKSec').length).toBe(1);
  });
});

describe('summary', () => {
  it('covers plan, recent logs and the coach, and leaves out old logs', () => {
    const s = setupState();
    s.profile.age = 40;
    addLog(s, 'A', '2026-09-01');
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': { value: 'top', rir: 2 } } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': { value: 'top', rir: 2 } }, pain: 'left knee twinge' });
    addRun(s, '2026-11-18', { km: 6.5, sec: 2535, type: 'tempo', rpe: 7 });
    addCheckin(s, '2026-11-20', { energy: 4, sleep: 3 });
    const text = buildSummary(s, '2026-11-20');
    expect(text).toContain('age 40');
    expect(text).toContain('Session A: Unilateral strength');
    expect(text).toContain('- Press-up: 3 × 8–12 (2 s down)');
    expect(text).toContain('Strength sessions: 2');
    expect(text).toContain('6.5 km in 42:15 (6:30 /km), tempo, effort 7/10');
    expect(text).toContain('Pain note: left knee twinge');
    expect(text).toContain('energy 4, sleep 3');
    expect(text).toContain('BENCHMARKS');
    expect(text).toContain('Press-up: 12, 12, 12 (RIR 2)');
    expect(text).toContain('bodyweight only, exercise mat;');
    expect(text.includes('1 Sept') || text.includes('Tue 1 Sep')).toBe(false);
    expect(text).toContain('Please review');
  });
});
