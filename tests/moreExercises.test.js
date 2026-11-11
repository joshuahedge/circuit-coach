import { describe, it, expect } from './harness.js';
import { MORE_EXERCISES, MORE_VARIATIONS } from '../src/moreExercises.js';
import { EXERCISES as ALL, BASE_EXERCISE_IDS, isBannedName } from '../src/library.js';

// The original ten (library.js merges the 25 into the same object).
const EXERCISES = Object.fromEntries(BASE_EXERCISE_IDS.map((id) => [id, ALL[id]]));
import { VARIATIONS } from '../src/routines.js';

const LEVERS = ['tempo', 'pause', 'variation', 'sets'];
const AREAS = ['legs', 'push', 'back', 'core'];
const FOCUSES = ['single-leg', 'squat', 'hinge', 'glutes', 'calves', 'shins', 'chest', 'shoulders', 'triceps',
  'shoulder-blades', 'upper-back', 'front-core', 'side-core', 'anti-rotation'];
const more = Object.values(MORE_EXERCISES);
const allExercises = [...Object.values(EXERCISES), ...more];

// Steps for a version name, from any of the places the app looks.
function stepsFor(name) {
  if (VARIATIONS[name]) return VARIATIONS[name];
  if (MORE_VARIATIONS[name]) return MORE_VARIATIONS[name];
  return allExercises.find((e) => e.name === name) || null;
}

function versionNames(ex) {
  return [...ex.ladder.map((l) => l.name), ...ex.swaps.map((s) => s.name)];
}

describe('more exercises', () => {
  it('has 25 entries with unique ids and names that do not clash with the library', () => {
    expect(more.length).toBe(25);
    const libNames = Object.values(EXERCISES).map((e) => e.name.toLowerCase());
    const seen = new Set();
    for (const [key, ex] of Object.entries(MORE_EXERCISES)) {
      expect(ex.id).toBe(key);
      expect(EXERCISES[key]).toBe(undefined);
      const n = ex.name.toLowerCase();
      if (libNames.includes(n)) throw new Error(`${ex.name} clashes with a library exercise`);
      if (seen.has(n)) throw new Error(`${ex.name} is used twice`);
      seen.add(n);
    }
  });

  it('every entry has the library shape', () => {
    for (const ex of more) {
      const where = ex.id;
      if (!['reps', 'seconds'].includes(ex.unit)) throw new Error(`${where}: unit ${ex.unit}`);
      expect(ex.sides === null || JSON.stringify(ex.sides) === '["L","R"]').toBe(true);
      expect(typeof ex.legHeavy).toBe('boolean');
      expect(typeof ex.cap).toBe('number');
      expect(ex.cap).toBeGreaterThanOrEqual(ex.start.max);
      expect(Array.isArray(ex.levers) && ex.levers.length > 0).toBe(true);
      expect(new Set(ex.levers).size).toBe(ex.levers.length);
      for (const l of ex.levers) if (!LEVERS.includes(l)) throw new Error(`${where}: lever ${l}`);
      if (ex.unit === 'seconds' && ex.levers.some((l) => l === 'tempo' || l === 'pause')) {
        throw new Error(`${where}: holds cannot use tempo or pause`);
      }
      expect(ex.howTo.length).toBeGreaterThanOrEqual(3);
      expect(typeof ex.cues === 'string' && ex.cues.length > 0).toBe(true);
      if (!AREAS.includes(ex.area)) throw new Error(`${where}: area ${ex.area}`);
      if (!FOCUSES.includes(ex.focus)) throw new Error(`${where}: focus ${ex.focus}`);
      expect(typeof ex.note === 'string' && ex.note.length > 0).toBe(true);
    }
  });

  it('ladders, swaps and starting prescriptions line up', () => {
    for (const ex of more) {
      expect(ex.ladder.length).toBeGreaterThan(0);
      for (const r of ex.ladder) {
        if (!(r.min <= r.max)) throw new Error(`${ex.id}: rung ${r.name} has min > max`);
      }
      const own = ex.ladder.find((r) => r.name === ex.name);
      if (!own) throw new Error(`${ex.id}: no ladder rung named after the exercise`);
      expect([own.min, own.max]).toEqual([ex.start.min, ex.start.max]);
      expect(ex.swaps.length).toBe(2);
      for (const s of ex.swaps) expect(typeof s.note === 'string' && s.note.length > 0).toBe(true);
      const st = ex.start;
      expect(st.sets >= 1 && st.sets <= st.maxSets).toBe(true);
      expect([3, 4].includes(st.maxSets)).toBe(true);
      expect(typeof st.tempoDown === 'number' && typeof st.pause === 'number').toBe(true);
      if (ex.unit === 'seconds') expect([st.tempoDown, st.pause]).toEqual([0, 0]);
    }
  });

  it('every harder version and swap has its own how-to', () => {
    for (const ex of more) {
      for (const name of versionNames(ex)) {
        if (name === ex.name) continue;
        const h = stepsFor(name);
        if (!h) throw new Error(`${ex.id}: no how-to for ${name}`);
        expect(h.howTo.length).toBeGreaterThanOrEqual(3);
        expect(typeof h.cues === 'string' && h.cues.length > 0).toBe(true);
      }
    }
  });

  it('new how-tos do not redefine existing ones and are all used', () => {
    const names = allExercises.map((e) => e.name);
    const used = new Set(more.flatMap(versionNames));
    for (const [key, v] of Object.entries(MORE_VARIATIONS)) {
      if (VARIATIONS[key]) throw new Error(`${key} is already in VARIATIONS`);
      if (names.includes(key)) throw new Error(`${key} is an exercise name`);
      if (!used.has(key)) throw new Error(`${key} is not used by any exercise`);
      expect(v.howTo.length).toBe(4);
      expect(typeof v.cues === 'string' && v.cues.length > 0).toBe(true);
    }
  });

  it('reused steps match the existing how-to text', () => {
    for (const id of ['lateral-lunge', 'prone-swimmers', 'bird-dog']) {
      const ex = MORE_EXERCISES[id];
      expect(ex.howTo).toEqual(VARIATIONS[ex.name].howTo);
      expect(ex.cues).toBe(VARIATIONS[ex.name].cues);
    }
  });

  it('has no banned moves, running or jumping anywhere', () => {
    const text = [
      ...more.flatMap((ex) => [ex.name, ex.note, ex.cues, ...ex.howTo,
        ...ex.ladder.map((r) => r.name), ...ex.swaps.flatMap((s) => [s.name, s.note])]),
      ...Object.entries(MORE_VARIATIONS).flatMap(([k, v]) => [k, ...v.howTo, v.cues]),
    ];
    expect(text.filter(isBannedName)).toEqual([]);
    expect(text.filter((t) => /\brun(ning|ner|s)?\b/i.test(t))).toEqual([]);
    expect(text.filter((t) => /\bjump/i.test(t))).toEqual([]);
  });

  it('covers every area', () => {
    const count = (area) => more.filter((ex) => ex.area === area).length;
    expect(count('legs')).toBeGreaterThanOrEqual(6);
    expect(count('push')).toBeGreaterThanOrEqual(6);
    expect(count('core')).toBeGreaterThanOrEqual(6);
    expect(count('back')).toBeGreaterThanOrEqual(5);
  });
});
