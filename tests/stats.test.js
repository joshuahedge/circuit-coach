import { describe, it, expect } from './harness.js';
import { exerciseSeries, weeklyTotals, effortSeries, benchmarkSeries, loggedExerciseIds } from '../src/stats.js';
import { buildSummary } from '../src/summary.js';
import { setupState, addLog, addCheckin } from './fixtures.js';

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

  it('weekly session counts over 8 weeks with empty weeks', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-03');
    addLog(s, 'B', '2026-11-05');
    const w = weeklyTotals(s, '2026-11-12');
    expect(w.length).toBe(8);
    expect(w[7].weekStart).toBe('2026-11-09');
    expect(w[6]).toEqual({ weekStart: '2026-11-02', strength: 2 });
    expect(w[0].strength).toBe(0);
  });

  it('effort and benchmark series', () => {
    const s = setupState();
    addLog(s, 'B', '2026-11-05', { rpe: 8 });
    expect(effortSeries(s)).toEqual([{ date: '2026-11-05', rpe: 8, sessionId: 'B' }]);
    s.benchmarks.push({ id: 'b1', date: '2026-12-01', pressUps: 24 });
    expect(benchmarkSeries(s, 'pressUps').map((x) => x.value)).toEqual([20, 24]);
  });
});

describe('summary', () => {
  it('covers plan, recent logs and the coach, and leaves out old logs', () => {
    const s = setupState();
    s.profile.age = 40;
    addLog(s, 'A', '2026-09-01');
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': { value: 'top', rir: 2 } } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': { value: 'top', rir: 2 } }, pain: 'left knee twinge' });
    addCheckin(s, '2026-11-20', { energy: 4, sleep: 3 });
    const text = buildSummary(s, '2026-11-20');
    expect(text).toContain('age 40');
    expect(text).toContain('Session A: Unilateral strength');
    expect(text).toContain('- Press-up: 3 × 8–12 (2 s down)');
    expect(text).toContain('Strength sessions: 2');
    expect(text).toContain('CIRCUIT COACH');
    expect(text).toContain('- Sessions: Tue Session A, Thu Session B');
    expect(/(run|runs|running|10K|km)/i.test(text)).toBe(false);
    expect(text).toContain('done as circuits');
    expect(text).toContain('Pain note: left knee twinge');
    expect(text).toContain('energy 4, sleep 3');
    expect(text).toContain('BENCHMARKS');
    expect(text).toContain('Press-up: 12, 12, 12 (RIR 2)');
    expect(text).toContain('bodyweight only, exercise mat;');
    expect(text.includes('1 Sept') || text.includes('Tue 1 Sep')).toBe(false);
    expect(text).toContain('Please review');
  });
});
