import { describe, it, expect } from './harness.js';
import { EXERCISES, isBannedName, WARMUPS, COOLDOWN } from '../src/library.js';
import {
  defaultSessions, createInitialPlan, currentPlan, prescriptionLabel, tempoLabel, sideCount, estimateMinutes,
  withPrescription, revertPlan, ladderIndex, samePrescription,
} from '../src/plan.js';

const T = '2026-11-09';

function allNames() {
  const names = [];
  for (const ex of Object.values(EXERCISES)) {
    names.push(ex.name, ...ex.ladder.map((l) => l.name), ...ex.swaps.map((s) => s.name), ...ex.howTo, ex.cues);
  }
  names.push(WARMUPS.A, WARMUPS.B, COOLDOWN);
  return names;
}

describe('library', () => {
  it('never contains burpees or mountain climbers', () => {
    expect(isBannedName('Burpees')).toBe(true);
    expect(isBannedName('mountain climber')).toBe(true);
    expect(isBannedName('Mountain-climbers')).toBe(true);
    expect(allNames().filter(isBannedName)).toEqual([]);
  });

  it('every exercise has a credited picture with a description', () => {
    for (const ex of Object.values(EXERCISES)) {
      const im = ex.image;
      expect(Boolean(im && im.srcs && im.srcs.length)).toBe(true);
      expect(im.alt.length).toBeGreaterThan(20);
      for (const x of im.srcs) expect(/^assets\/exercises\/[a-z0-9-]+\.(svg|jpg|png)$/.test(x.src)).toBe(true);
      if (!im.own) {
        expect(/^CC BY(-SA)? [0-9.]+$/.test(im.license)).toBe(true);
        expect(im.licenseUrl.startsWith('https://creativecommons.org/licenses/')).toBe(true);
        expect(im.sourceUrl.startsWith('https://')).toBe(true);
        expect(im.credit.length).toBeGreaterThan(2);
      }
    }
  });

  it('every exercise has how-to steps, a ladder and swaps', () => {
    for (const ex of Object.values(EXERCISES)) {
      expect(ex.howTo.length).toBeGreaterThan(1);
      expect(ex.ladder.length).toBeGreaterThan(0);
      expect(ex.swaps.length).toBeGreaterThan(0);
      for (const l of ex.ladder) expect(l.min <= l.max).toBe(true);
    }
  });
});

describe('plan', () => {
  it('default sessions match the brief', () => {
    const s = defaultSessions(T);
    expect(s.A.exercises.map((p) => p.exerciseId)).toEqual(['reverse-lunge', 'press-up', 'sl-glute-bridge', 'prone-ytw', 'dead-bug']);
    expect(s.B.exercises.map((p) => p.exerciseId)).toEqual(['sl-rdl', 'tempo-squat', 'pike-push-up', 'sl-calf-raise', 'side-plank']);
    for (const sess of [s.A, s.B]) {
      for (const p of sess.exercises) {
        expect(Boolean(EXERCISES[p.exerciseId])).toBe(true);
        expect(p.since).toBe(T);
      }
    }
    const labels = s.A.exercises.map(prescriptionLabel);
    expect(labels).toEqual(['3 × 8–10 per leg', '3 × 8–12', '2 × 5–6 per leg', '2 × 6–8 each position', '3 × 8–10 per side']);
    expect(s.B.exercises.map(prescriptionLabel)).toEqual(['3 × 8 per leg', '3 × 10–12', '2 × 6–8', '3 × 10–12 per leg', '2 × 25–40 s per side']);
  });

  it('tempo labels', () => {
    const s = defaultSessions(T);
    expect(tempoLabel(s.B.exercises[1])).toBe('3 s down, 1 s pause');
    expect(tempoLabel(s.B.exercises[4])).toBe('');
  });

  it('side counts', () => {
    const s = defaultSessions(T);
    expect(sideCount(s.A.exercises[0])).toBe(2);
    expect(sideCount(s.A.exercises[1])).toBe(1);
    expect(sideCount(s.A.exercises[3])).toBe(3);
  });

  it('estimates both sessions inside 30–40 minutes', () => {
    const s = defaultSessions(T);
    const a = estimateMinutes(s.A);
    const b = estimateMinutes(s.B);
    expect(a >= 30 && a <= 40).toBe(true);
    expect(b >= 30 && b <= 40).toBe(true);
    const bigger = { ...s.A, exercises: s.A.exercises.map((p) => ({ ...p, sets: p.sets + 2 })) };
    expect(estimateMinutes(bigger)).toBeGreaterThan(a + 5);
  });

  it('initial plan is version 1 accepted', () => {
    const p = createInitialPlan(T);
    expect(p.version).toBe(1);
    expect(p.acceptedByUser).toBe(true);
    expect(p.effectiveFrom).toBe(T);
    expect(currentPlan({ plans: [p] })).toBe(p);
  });

  it('withPrescription makes the next version and leaves the old one alone', () => {
    const v1 = createInitialPlan('2026-11-02');
    const old = v1.sessions.A.exercises[1];
    const next = { ...old, min: 9, max: 13 };
    const v2 = withPrescription(v1, 'A', 'press-up', next, { today: T, reason: 'More reps' });
    expect(v2.version).toBe(2);
    expect(v2.reason).toBe('More reps');
    expect(v2.effectiveFrom).toBe(T);
    expect(v2.sessions.A.exercises[1].max).toBe(13);
    expect(v2.sessions.A.exercises[1].since).toBe(T);
    expect(v2.sessions.A.exercises[0].since).toBe('2026-11-02');
    expect(v1.sessions.A.exercises[1].max).toBe(12);
  });

  it('revertPlan copies an old version as a new one and resets since only where it changed', () => {
    const v1 = createInitialPlan('2026-11-02');
    const v2 = withPrescription(v1, 'A', 'press-up', { ...v1.sessions.A.exercises[1], max: 13 }, { today: '2026-11-05', reason: 'x' });
    const v3 = revertPlan({ plans: [v1, v2] }, 1, T);
    expect(v3.version).toBe(3);
    expect(v3.reason).toBe('Went back to version 1');
    expect(v3.sessions.A.exercises[1].max).toBe(12);
    expect(v3.sessions.A.exercises[1].since).toBe(T);
    expect(v3.sessions.A.exercises[0].since).toBe('2026-11-02');
  });

  it('ladderIndex finds the variation, -1 for a swap', () => {
    const s = defaultSessions(T);
    expect(ladderIndex(s.B.exercises[2])).toBe(1); // pike starts on the second rung
    expect(ladderIndex({ ...s.A.exercises[1], variation: 'Knee press-up' })).toBe(-1);
  });

  it('samePrescription ignores since', () => {
    const s = defaultSessions(T);
    const p = s.A.exercises[0];
    expect(samePrescription(p, { ...p, since: '2020-01-01' })).toBe(true);
    expect(samePrescription(p, { ...p, sets: 4 })).toBe(false);
  });
});
