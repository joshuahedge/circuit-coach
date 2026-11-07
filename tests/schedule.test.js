import { describe, it, expect } from './harness.js';
import {
  recommendStrengthDays, blockInfo, runProtection, weekModel, scheduleWarnings, runCategory,
} from '../src/schedule.js';
import { emptyState } from '../src/store.js';

let runSeq = 0;
function addRunTo(s, date, runType, forDay = null) {
  runSeq += 1;
  s.runLogs.push({ id: `x${runSeq}`, date, distanceKm: 5, durationSec: 1800, runType, forDay });
}

function state(runDays, strengthDays = { tue: 'A', thu: 'B' }) {
  const s = emptyState(new Date(2026, 10, 2));
  s.setupDone = true;
  s.schedule = { runDays, strengthDays };
  s.block = { number: 1, startDate: '2026-11-02' };
  return s;
}

describe('schedule: recommend strength days', () => {
  it('long run Saturday gives Tuesday A and Thursday B', () => {
    const r = recommendStrengthDays({ mon: 'easy', wed: 'quality', sat: 'long' });
    expect(r.strengthDays).toEqual({ tue: 'A', thu: 'B' });
    expect(r.reasons.join(' ')).toContain('long run');
  });

  it('long run Monday avoids Sunday', () => {
    const r = recommendStrengthDays({ mon: 'long', wed: 'easy', sat: 'quality' });
    expect(Object.keys(r.strengthDays).includes('sun')).toBe(false);
    expect(Object.keys(r.strengthDays).length).toBe(2);
  });

  it('never picks a run day or consecutive days when there is a choice', () => {
    const r = recommendStrengthDays({ mon: 'easy', wed: 'long', sat: 'quality' });
    const days = Object.keys(r.strengthDays);
    expect(days.some((d) => ['mon', 'wed', 'sat'].includes(d))).toBe(false);
    const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const [i, j] = days.map((d) => order.indexOf(d)).sort((a, b) => a - b);
    expect(j - i > 1).toBe(true);
  });

  it('A goes on the earlier day', () => {
    const r = recommendStrengthDays({ mon: 'quality', wed: 'easy', sat: 'long' });
    const entries = Object.entries(r.strengthDays);
    expect(entries[0][1]).toBe('A');
    expect(entries[1][1]).toBe('B');
  });

  it('six or seven run days still give two strength days', () => {
    const six = recommendStrengthDays({ mon: 'easy', tue: 'easy', wed: 'quality', thu: 'easy', fri: 'easy', sat: 'long' });
    expect(Object.keys(six.strengthDays).length).toBe(2);
    const seven = recommendStrengthDays({ mon: 'easy', tue: 'easy', wed: 'quality', thu: 'easy', fri: 'easy', sat: 'long', sun: 'easy' });
    expect(Object.keys(seven.strengthDays).length).toBe(2);
    expect(seven.reasons.length).toBe(2);
  });

  it('unknown run types count as other', () => {
    const r = recommendStrengthDays({ mon: null, wed: null, sat: null });
    expect(r.strengthDays).toEqual({ tue: 'A', thu: 'B' });
  });
});

describe('schedule: block and protection', () => {
  it('block weeks and phases', () => {
    const s = state({ mon: 'easy', wed: 'quality', sat: 'long' });
    expect(blockInfo(s, '2026-11-04').week).toBe(1);
    expect(blockInfo(s, '2026-11-04').phase).toBe('establish');
    expect(blockInfo(s, '2026-11-16').phase).toBe('build');
    expect(blockInfo(s, '2026-11-30').phase).toBe('intensify');
    expect(blockInfo(s, '2026-12-14').phase).toBe('consolidate');
    expect(blockInfo(s, '2026-12-28').week).toBe(9);
    expect(blockInfo(s, '2026-12-28').phase).toBe('review');
  });

  it('run protection 1–2 days before the long run only', () => {
    const s = state({ mon: 'easy', wed: 'quality', sat: 'long' });
    expect(runProtection(s, '2026-11-05').longRunSoon).toBe(true); // Thu
    expect(runProtection(s, '2026-11-05').daysToLong).toBe(2);
    expect(runProtection(s, '2026-11-06').longRunSoon).toBe(true); // Fri
    expect(runProtection(s, '2026-11-03').longRunSoon).toBe(false); // Tue
    expect(runProtection(s, '2026-11-03').qualityTomorrow).toBe(true);
    expect(runProtection(s, '2026-11-05').qualityTomorrow).toBe(false);
  });

  it('run categories', () => {
    expect(runCategory('tempo')).toBe('quality');
    expect(runCategory('intervals')).toBe('quality');
    expect(runCategory('long')).toBe('long');
    expect(runCategory('easy')).toBe('easy');
    expect(runCategory('other')).toBe('other');
  });
});

describe('schedule: week model', () => {
  it('ticks done items and totals km', () => {
    const s = state({ mon: 'easy', wed: 'quality', sat: 'long' });
    s.runLogs.push({ id: 'r1', date: '2026-11-02', distanceKm: 5, durationSec: 1800, runType: 'easy' });
    s.runLogs.push({ id: 'r2', date: '2026-11-04', distanceKm: 6.5, durationSec: 2400, runType: 'tempo' });
    s.strengthLogs.push({ id: 's1', date: '2026-11-03', sessionId: 'A', exercises: [] });
    const m = weekModel(s, '2026-11-05');
    expect(m.days.length).toBe(7);
    expect(m.runKm).toBe(11.5);
    expect(m.runsDone).toBe(2);
    expect(m.strengthDone).toBe(1);
    const mon = m.days[0].planned[0];
    expect(mon.kind).toBe('run');
    expect(mon.status).toBe('done');
    expect(m.days[1].planned[0].status).toBe('done');
    expect(m.days[3].planned[0].status).toBe('today');
    expect(m.nextUp.iso).toBe('2026-11-05');
    expect(m.nextUp.item.sessionId).toBe('B');
  });

  it('a moved run fills the planned slot and missed items show as missed', () => {
    const s = state({ mon: 'easy', wed: 'quality', sat: 'long' });
    s.runLogs.push({ id: 'r1', date: '2026-11-03', distanceKm: 5, durationSec: 1800, runType: 'easy' });
    const m = weekModel(s, '2026-11-05');
    expect(m.days[0].planned[0].status).toBe('moved');
    expect(m.days[2].planned[0].status).toBe('missed');
  });

  it('an extra run never ticks a planned run still ahead', () => {
    const s = state({ mon: 'easy', wed: 'quality', sat: 'long' });
    addRunTo(s, '2026-11-02', 'easy');
    addRunTo(s, '2026-11-04', 'tempo');
    addRunTo(s, '2026-11-05', 'easy');
    const m = weekModel(s, '2026-11-05');
    expect(m.days[5].planned[0].status).toBe('upcoming');
    expect(m.runsExtra).toBe(1);
    expect(m.runsDone).toBe(2);
    expect(m.nextUp.item.kind).toBe('strength');
  });

  it('a run logged as a planned run done early ticks that slot', () => {
    const s = state({ mon: 'easy', wed: 'quality', sat: 'long' });
    addRunTo(s, '2026-11-05', 'long', '2026-11-07');
    const m = weekModel(s, '2026-11-05');
    expect(m.days[5].planned[0].status).toBe('moved');
    expect(m.runsExtra).toBe(0);
    expect(m.runsDone).toBe(1);
  });

  it('a missed slot only takes a run of a fitting type', () => {
    const s = state({ mon: 'easy', wed: 'quality', sat: 'long' });
    addRunTo(s, '2026-11-03', 'long');
    const m = weekModel(s, '2026-11-05');
    expect(m.days[0].planned[0].status).toBe('missed');
    expect(m.runsExtra).toBe(1);
  });

  it('a strength session on another day still counts', () => {
    const s = state({ mon: 'easy', wed: 'quality', sat: 'long' });
    s.strengthLogs.push({ id: 's1', date: '2026-11-04', sessionId: 'A', exercises: [] });
    const m = weekModel(s, '2026-11-05');
    expect(m.days[1].planned[0].status).toBe('moved');
  });

  it('next up rolls into next week', () => {
    const s = state({ mon: 'easy', wed: 'quality', sat: 'long' });
    s.runLogs.push({ id: 'r', date: '2026-11-07', distanceKm: 12, durationSec: 4800, runType: 'long' });
    const m = weekModel(s, '2026-11-08');
    expect(m.nextUp.iso).toBe('2026-11-09');
    expect(m.nextUp.item.kind).toBe('run');
  });
});

describe('schedule: warnings', () => {
  it('flags strength before the long run and consecutive days', () => {
    const w = scheduleWarnings({ runDays: { mon: 'easy', wed: 'quality', sat: 'long' }, strengthDays: { thu: 'A', fri: 'B' } });
    const text = w.map((x) => x.text).join(' ');
    expect(text).toContain('day before your long run');
    expect(text).toContain('back-to-back');
  });

  it('notes strength before the quality run', () => {
    const w = scheduleWarnings({ runDays: { mon: 'easy', wed: 'quality', sat: 'long' }, strengthDays: { tue: 'A', thu: 'B' } });
    expect(w.length).toBe(1);
    expect(w[0].level).toBe('info');
    expect(w[0].text).toContain('quality run');
  });
});
