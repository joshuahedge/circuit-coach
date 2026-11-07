import { describe, it, expect } from './harness.js';
import {
  orderedRows, nextUndone, restAfter, completeSet, adjustRest, remainingSec, startHold, holdElapsed, stopHold,
  clock, setLabel, REST_DEFAULTS, upNext,
} from '../src/timer.js';
import { createDraft } from '../src/draft.js';
import { setupState } from './fixtures.js';

const T0 = Date.parse('2026-11-03T18:00:00.000Z');

describe('timer: flow order', () => {
  it('circuit goes round by round, both sides together', () => {
    const d = createDraft(setupState(), 'A', '2026-11-03');
    const order = orderedRows(d).slice(0, 8).map(({ ei, ri }) => `${ei}:${d.exercises[ei].rows[ri].set}${d.exercises[ei].rows[ri].side || ''}`);
    expect(order).toEqual(['0:1L', '0:1R', '1:1', '2:1L', '2:1R', '3:1Y', '3:1T', '3:1W']);
    const round3 = orderedRows(d).filter(({ ei, ri }) => d.exercises[ei].rows[ri].set === 3).map(({ ei }) => ei);
    expect([...new Set(round3)]).toEqual([0, 1, 4]); // bridges and Y–T–W have only 2 sets
  });

  it('skipped exercises drop out of the circuit', () => {
    const d = createDraft(setupState(), 'A', '2026-11-03');
    d.exercises[0].status = 'skipped';
    const order = orderedRows(d);
    expect(order[0]).toEqual({ ei: 1, ri: 0 });
    expect(order[1]).toEqual({ ei: 2, ri: 0 });
  });

  it('after a set out of order, carry on from there', () => {
    const d = createDraft(setupState(), 'A', '2026-11-03');
    completeSet(d, { ei: 2, ri: 0 }, { nowMs: T0 });
    expect(upNext(d)).toEqual({ ei: 2, ri: 1 });
    completeSet(d, { ei: 2, ri: 1 }, { nowMs: T0 });
    expect(upNext(d)).toEqual({ ei: 3, ri: 0 });
  });

  it('next undone follows the order', () => {
    const d = createDraft(setupState(), 'A', '2026-11-03');
    d.exercises[0].rows[0].done = true;
    expect(nextUndone(d)).toEqual({ ei: 0, ri: 1 });
    d.exercises.forEach((e) => e.rows.forEach((r) => { r.done = true; }));
    expect(nextUndone(d)).toBe(null);
  });
});

describe('timer: rest', () => {
  it('no rest between sides, short between exercises, long between rounds', () => {
    const d = createDraft(setupState(), 'A', '2026-11-03');
    expect(completeSet(d, { ei: 0, ri: 0 }, { nowMs: T0 })).toBe(null);
    const r1 = completeSet(d, { ei: 0, ri: 1 }, { nowMs: T0 });
    expect(r1.total).toBe(REST_DEFAULTS.short);
    expect(r1.kind).toBe('exercise');
    expect(r1.endsAt).toBe(T0 + 45000);
    for (const e of d.exercises) e.rows.filter((r) => r.set === 1).forEach((r) => { r.done = true; });
    const lastOfRound = { ei: 4, ri: 1 };
    d.exercises[4].rows[1].done = false;
    const r2 = completeSet(d, lastOfRound, { nowMs: T0 });
    expect(r2.kind).toBe('round');
    expect(r2.total).toBe(REST_DEFAULTS.long);
  });

  it('no rest after the last set', () => {
    const d = createDraft(setupState(), 'A', '2026-11-03');
    d.exercises.forEach((e) => e.rows.forEach((r) => { r.done = true; }));
    d.exercises[4].rows[5].done = false;
    expect(completeSet(d, { ei: 4, ri: 5 }, { nowMs: T0 })).toBe(null);
  });

  it('adjusts and counts down from timestamps', () => {
    const d = createDraft(setupState(), 'A', '2026-11-03');
    d.rest = { endsAt: T0 + 60000, total: 60, kind: 'round' };
    adjustRest(d, 15, T0);
    expect(d.rest.endsAt).toBe(T0 + 75000);
    adjustRest(d, -120, T0);
    expect(d.rest.endsAt).toBe(T0);
    expect(remainingSec(T0 + 59001, T0)).toBe(60);
    expect(remainingSec(T0 - 5000, T0)).toBe(0);
  });
});

describe('timer: hold', () => {
  it('counts up after a lead-in and logs the seconds', () => {
    const s = setupState();
    const d = createDraft(s, 'B', '2026-11-05');
    const ref = { ei: 4, ri: 0 };
    startHold(d, ref, T0);
    expect(holdElapsed(d.hold, T0 + 1000)).toBe(0);
    expect(holdElapsed(d.hold, T0 + 3000 + 31400)).toBe(31);
    const rest = stopHold(d, { nowMs: T0 + 3000 + 31400 });
    expect(d.exercises[4].rows[0].value).toBe(31);
    expect(d.exercises[4].rows[0].done).toBe(true);
    expect(d.hold).toBe(null);
    expect(rest.kind).toBe('switch'); // the other side comes next: a few seconds to get into position
    expect(rest.total).toBe(5);
  });

  it('stopping during the lead-in logs nothing', () => {
    const d = createDraft(setupState(), 'B', '2026-11-05');
    startHold(d, { ei: 4, ri: 0 }, T0);
    expect(stopHold(d, { nowMs: T0 + 1500 })).toBe(null);
    expect(d.exercises[4].rows[0].done).toBe(false);
  });
});

describe('timer: labels', () => {
  it('formats', () => {
    expect(clock(75)).toBe('1:15');
    expect(clock(5)).toBe('0:05');
    const d = createDraft(setupState(), 'A', '2026-11-03');
    expect(setLabel(d, { ei: 0, ri: 1 })).toBe('Set 1 of 3 · Right');
    expect(setLabel(d, { ei: 1, ri: 2 })).toBe('Set 3 of 3');
  });
});
