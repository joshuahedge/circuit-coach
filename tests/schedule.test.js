import { describe, it, expect } from './harness.js';
import { blockInfo, weekModel, scheduleWarnings, DEFAULT_DAYS } from '../src/schedule.js';
import { dayOf, withSessionDay } from '../src/ui/days.js';
import { setupState, addLog } from './fixtures.js';

describe('schedule: block', () => {
  it('block weeks and phases', () => {
    const s = setupState();
    expect(blockInfo(s, '2026-11-04').week).toBe(1);
    expect(blockInfo(s, '2026-11-04').phase).toBe('establish');
    expect(blockInfo(s, '2026-11-16').phase).toBe('build');
    expect(blockInfo(s, '2026-11-30').phase).toBe('intensify');
    expect(blockInfo(s, '2026-12-14').phase).toBe('consolidate');
    expect(blockInfo(s, '2026-12-28').week).toBe(9);
    expect(blockInfo(s, '2026-12-28').phase).toBe('review');
    expect(blockInfo(s, '2026-12-28').text.includes('running')).toBe(false);
  });
});

describe('schedule: training days', () => {
  it('defaults to two days with rest between', () => {
    expect(DEFAULT_DAYS).toEqual({ tue: 'A', fri: 'B' });
    expect(scheduleWarnings({ strengthDays: DEFAULT_DAYS })).toEqual([]);
  });

  it('moving a session keeps the others; onto a taken day, the two swap', () => {
    let d = withSessionDay({ tue: 'A', fri: 'B' }, 'A', 'mon');
    expect(d).toEqual({ mon: 'A', fri: 'B' });
    d = withSessionDay(d, 'B', 'mon');
    expect(d).toEqual({ mon: 'B', fri: 'A' });
    d = withSessionDay(d, 'C', 'wed');
    expect(d).toEqual({ mon: 'B', fri: 'A', wed: 'C' });
    d = withSessionDay(d, 'C', 'mon');
    expect(d).toEqual({ mon: 'C', fri: 'A', wed: 'B' });
  });

  it('warns about every pair of back-to-back sessions', () => {
    expect(scheduleWarnings({ strengthDays: { mon: 'A', wed: 'C', fri: 'B' } }).length).toBe(0);
    expect(scheduleWarnings({ strengthDays: { mon: 'A', tue: 'C', wed: 'B' } }).length).toBe(2);
  });

  it('warns about back-to-back days, including Sunday to Monday', () => {
    expect(scheduleWarnings({ strengthDays: { tue: 'A', wed: 'B' } })[0].text).toContain('back-to-back');
    expect(scheduleWarnings({ strengthDays: { sun: 'B', mon: 'A' } }).length).toBe(1);
  });
});

describe('schedule: week model', () => {
  it('ticks sessions done and finds next up', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-03');
    const m = weekModel(s, '2026-11-05');
    expect(m.days.length).toBe(7);
    expect(m.strengthDone).toBe(1);
    expect(m.strengthPlanned).toBe(2);
    expect(m.days[1].planned[0].status).toBe('done');
    expect(m.days[3].planned[0].status).toBe('today');
    expect(m.nextUp.iso).toBe('2026-11-05');
    expect(m.nextUp.item.sessionId).toBe('B');
  });

  it('a session on another day still counts, missed ones show as missed', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-04');
    let m = weekModel(s, '2026-11-05');
    expect(m.days[1].planned[0].status).toBe('moved');
    const t = setupState();
    m = weekModel(t, '2026-11-05');
    expect(m.days[1].planned[0].status).toBe('missed');
  });

  it('an extra session is counted and next up rolls into next week', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-03');
    addLog(s, 'B', '2026-11-05');
    addLog(s, 'A', '2026-11-07');
    const m = weekModel(s, '2026-11-08');
    expect(m.strengthDone).toBe(3);
    expect(m.extraIds.length).toBe(1);
    expect(m.nextUp.iso).toBe('2026-11-10');
  });
});
