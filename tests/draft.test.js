import { describe, it, expect } from './harness.js';
import { createDraft, finishDraft, draftProgress, elapsedMinutes } from '../src/draft.js';
import { setupState, addLog } from './fixtures.js';

describe('draft', () => {
  it('builds rows by set and side from the plan', () => {
    const s = setupState();
    const d = createDraft(s, 'A', '2026-11-03', { nowIso: '2026-11-03T18:00:00.000Z' });
    const lunge = d.exercises[0];
    expect(lunge.rows.length).toBe(6);
    expect(lunge.rows.slice(0, 2).map((r) => `${r.set}${r.side}`)).toEqual(['1L', '1R']);
    expect(lunge.rows[0].value).toBe(8);
    expect(d.exercises[3].rows.slice(0, 3).map((r) => r.side)).toEqual(['Y', 'T', 'W']);
    expect(d.exercises[1].rows.length).toBe(3);
    expect(d.exercises[1].rows[0].side).toBe(null);
  });

  it('prefills from the last session of the same exercise', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-03', { ex: { 'press-up': { value: 11 } } });
    const d = createDraft(s, 'A', '2026-11-05');
    expect(d.exercises[1].rows.map((r) => r.value)).toEqual([11, 11, 11]);
  });

  it('finishing keeps only ticked sets and marks untouched exercises skipped', () => {
    const s = setupState();
    const d = createDraft(s, 'A', '2026-11-03', { nowIso: '2026-11-03T18:00:00.000Z' });
    d.exercises[1].rows.forEach((r) => { r.done = true; r.value = 10; r.rir = 2; });
    d.exercises[2].status = 'skipped';
    d.exercises[2].reason = 'Short on time';
    d.exercises[4].status = 'modified';
    d.exercises[4].variation = 'Bird dog';
    d.exercises[4].rows[0].done = true;
    d.rpe = 7;
    d.pain = '  ';
    const log = finishDraft(d, { nowMs: Date.parse('2026-11-03T18:37:00.000Z'), id: 'x' });
    expect(log.durationMin).toBe(37);
    expect(log.pain).toBe('');
    expect(log.exercises[0].status).toBe('skipped');
    expect(log.exercises[0].reason).toBe('Not done');
    expect(log.exercises[1].status).toBe('done');
    expect(log.exercises[1].sets).toEqual([{ set: 1, side: null, value: 10, rir: 2 }, { set: 2, side: null, value: 10, rir: 2 }, { set: 3, side: null, value: 10, rir: 2 }]);
    expect(log.exercises[2].reason).toBe('Short on time');
    expect(log.exercises[2].sets).toEqual([]);
    expect(log.exercises[4].status).toBe('modified');
    expect(log.exercises[4].variation).toBe('Bird dog');
    expect(log.exercises[4].target.variation).toBe('Dead bug');
  });

  it('a typed duration wins over the clock', () => {
    const s = setupState();
    const d = createDraft(s, 'A', '2026-11-03', { nowIso: '2026-11-03T18:00:00.000Z' });
    d.durationMin = 38;
    expect(finishDraft(d, { nowMs: Date.parse('2026-11-03T22:00:00.000Z'), id: 'x' }).durationMin).toBe(38);
    expect(elapsedMinutes(d, Date.parse('2026-11-03T18:10:20.000Z'))).toBe(10);
  });

  it('progress counts ticked sets', () => {
    const s = setupState();
    const d = createDraft(s, 'A', '2026-11-03');
    d.exercises[1].rows[0].done = true;
    const p = draftProgress(d);
    expect(p.done).toBe(1);
    expect(p.total).toBe(6 + 3 + 4 + 6 + 6);
  });
});
