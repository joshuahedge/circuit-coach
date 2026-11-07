import { describe, it, expect } from './harness.js';
import { startGuide, advanceGuide, skipStep, pauseGuide, resumeGuide, guideRemaining, guideDone, guideTotalLeft } from '../src/guide.js';
import { VARIATIONS, howToFor, WARMUP_STEPS, COOLDOWN_STEPS, routineMinutes } from '../src/routines.js';
import { EXERCISES, isBannedName } from '../src/library.js';

const T0 = 1_800_000_000_000;
const steps = [{ name: 'a', sec: 30 }, { name: 'b', sec: 45 }, { name: 'c', sec: 60 }];

describe('guided routine', () => {
  it('counts down each step and moves on', () => {
    const g = startGuide(steps, T0);
    expect(guideRemaining(g, T0 + 1000)).toBe(29);
    expect(advanceGuide(g, T0 + 29999)).toBe(0);
    expect(advanceGuide(g, T0 + 30000)).toBe(1);
    expect(g.idx).toBe(1);
    expect(guideRemaining(g, T0 + 30000)).toBe(45);
    expect(guideTotalLeft(g, T0 + 30000)).toBe(105);
  });

  it('catches up after the phone was locked', () => {
    const g = startGuide(steps, T0);
    expect(advanceGuide(g, T0 + 80000)).toBe(2);
    expect(g.idx).toBe(2);
    expect(guideRemaining(g, T0 + 80000)).toBe(55);
    advanceGuide(g, T0 + 999999);
    expect(guideDone(g)).toBe(true);
  });

  it('skips and pauses', () => {
    const g = startGuide(steps, T0);
    skipStep(g, T0 + 5000);
    expect(g.idx).toBe(1);
    expect(guideRemaining(g, T0 + 5000)).toBe(45);
    pauseGuide(g, T0 + 15000);
    expect(advanceGuide(g, T0 + 999999)).toBe(0);
    expect(guideRemaining(g, T0 + 999999)).toBe(35);
    resumeGuide(g, T0 + 100000);
    expect(guideRemaining(g, T0 + 100000)).toBe(35);
    skipStep(g, T0 + 100000);
    skipStep(g, T0 + 100000);
    expect(guideDone(g)).toBe(true);
  });
});

describe('routines content', () => {
  it('every harder version and swap has its own how-to', () => {
    for (const ex of Object.values(EXERCISES)) {
      for (const name of [...ex.ladder.map((l) => l.name), ...ex.swaps.map((s) => s.name)]) {
        const h = howToFor(ex.id, name);
        expect(h.own).toBe(true);
        expect(h.howTo.length).toBeGreaterThan(2);
      }
    }
    expect(howToFor('pike-push-up', 'Press-up').howTo).toEqual(EXERCISES['press-up'].howTo);
    expect(howToFor('press-up', 'Something new').own).toBe(false);
  });

  it('routines are the right length, with no banned moves', () => {
    expect(routineMinutes(WARMUP_STEPS.A)).toBe(5);
    expect(routineMinutes(WARMUP_STEPS.B)).toBe(5);
    expect(routineMinutes(COOLDOWN_STEPS)).toBe(4);
    const all = [...WARMUP_STEPS.A, ...WARMUP_STEPS.B, ...COOLDOWN_STEPS].map((s) => `${s.name} ${s.cue}`);
    const text = [...all, ...Object.entries(VARIATIONS).flatMap(([k, v]) => [k, ...v.howTo, v.cues])];
    expect(text.filter(isBannedName)).toEqual([]);
    expect(text.some((t) => /\brun(ning|ner|s)?\b/i.test(t))).toBe(false);
  });
});
