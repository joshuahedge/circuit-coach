import { describe, it, expect } from './harness.js';
import { nextBlockProposals, applyNextBlock } from '../src/blockReview.js';
import { coachReview, startEasyWeek, afterSessionSaved, shortenRests, dismissNote } from '../src/coach.js';
import { currentPlan, withPrescription, estimateMinutes } from '../src/plan.js';
import { createDraft, finishDraft } from '../src/draft.js';
import { EXERCISES } from '../src/library.js';
import { addDays } from '../src/dates.js';
import { setupState, addLog, addCheckin } from './fixtures.js';

const REVIEW = '2027-01-01'; // Friday of week 9 of a block that started 2 Nov 2026

function block({ weeks = 8, start = '2026-11-02', s = setupState({ start }), opts = {} } = {}) {
  for (let w = 0; w < weeks; w++) {
    const mon = addDays(start, 7 * w);
    addLog(s, 'A', addDays(mon, 1), opts);
    addLog(s, 'B', addDays(mon, 3), opts);
  }
  return s;
}

// Block 2 under review, with block 1 logged before it (16 weeks of sessions in all).
function twoBlocks({ skip = 0 } = {}) {
  const s = setupState({ start: '2026-09-07' });
  block({ start: '2026-09-07', s });
  block({ start: '2026-11-02', s });
  s.block = { number: 2, startDate: '2026-11-02' };
  s.strengthLogs.splice(0, skip);
  return s;
}

describe('evolve: a fresh exercise each block', () => {
  it('offers one per session, like for like, even when fixes fill the other slots', () => {
    const r = nextBlockProposals(block(), REVIEW);
    for (const id of ['A', 'B']) {
      const fresh = r.proposals.filter((p) => p.sessionId === id && p.rule === 'fresh');
      expect(fresh.length).toBe(1);
      const from = EXERCISES[fresh[0].exerciseId];
      const to = EXERCISES[fresh[0].to.exerciseId];
      expect(to.id === from.id).toBe(false);
      expect(to.area).toBe(from.area);
      expect(fresh[0].title).toContain('Fresh exercise:');
      expect(fresh[0].reason).toContain('stays in Progress');
      const fixes = r.proposals.filter((p) => p.sessionId === id && p.rule !== 'fresh');
      expect(fixes.some((p) => p.exerciseId === fresh[0].exerciseId)).toBe(false);
    }
  });

  it('starting the next block swaps the exercise in place', () => {
    const s = block();
    const fresh = nextBlockProposals(s, REVIEW).proposals.find((p) => p.sessionId === 'A' && p.rule === 'fresh');
    const next = applyNextBlock(s, REVIEW, [fresh]);
    const ids = currentPlan(next).sessions.A.exercises.map((p) => p.exerciseId);
    const before = currentPlan(s).sessions.A.exercises.map((p) => p.exerciseId);
    expect(ids.length).toBe(before.length);
    expect(ids.indexOf(fresh.to.exerciseId)).toBe(before.indexOf(fresh.exerciseId));
    expect(ids.includes(fresh.exerciseId)).toBe(false);
  });
});

describe('evolve: a third session', () => {
  it('is offered, switched off, after two blocks with nearly every session done', () => {
    const r = nextBlockProposals(twoBlocks(), REVIEW);
    const third = r.proposals.find((p) => p.kind === 'third-session');
    expect(Boolean(third)).toBe(true);
    expect(third.defaultOff).toBe(true);
    const c = third.addSession.session;
    expect(c.exercises.length).toBe(4);
    expect(new Set(c.exercises.map((p) => EXERCISES[p.exerciseId].area)).size).toBe(4);
    const inAB = new Set([...currentPlan(twoBlocks()).sessions.A.exercises, ...currentPlan(twoBlocks()).sessions.B.exercises].map((p) => p.exerciseId));
    expect(c.exercises.some((p) => inAB.has(p.exerciseId))).toBe(false);
    expect(estimateMinutes(c)).toBeLessThanOrEqual(32);
    expect(['tue', 'wed', 'thu'].includes(third.addSession.day)).toBe(false); // away from Tue A and Thu B
  });

  it('is not offered after one block, or when sessions were missed', () => {
    expect(nextBlockProposals(block(), REVIEW).proposals.some((p) => p.kind === 'third-session')).toBe(false);
    expect(nextBlockProposals(twoBlocks({ skip: 6 }), REVIEW).proposals.some((p) => p.kind === 'third-session')).toBe(false);
  });

  it('adding it puts Session C in the plan and the week, and the coach and workouts handle it', () => {
    const s = twoBlocks();
    const third = nextBlockProposals(s, REVIEW).proposals.find((p) => p.kind === 'third-session');
    const next = applyNextBlock(s, REVIEW, [third]);
    expect(Object.keys(currentPlan(next).sessions).sort()).toEqual(['A', 'B', 'C']);
    expect(next.schedule.strengthDays[third.addSession.day]).toBe('C');
    expect(currentPlan(next).sessions.C.targetMin).toBe(30);
    const d = createDraft(next, 'C', '2027-01-05');
    expect(d.exercises.length).toBe(4);
    expect(Array.isArray(coachReview(next, '2027-01-05').suggestions)).toBe(true);
  });
});

describe('evolve: an easy week', () => {
  function tired() {
    const s = setupState();
    const dates = ['2026-11-17', '2026-11-19', '2026-11-24', '2026-11-26', '2026-12-01', '2026-12-03'];
    const rpes = [7, 7, 7, 9, 9, 9];
    dates.forEach((d, i) => addLog(s, i % 2 ? 'B' : 'A', d, { rpe: rpes[i], value: i >= 4 ? 'low' : 'min' }));
    return s;
  }

  it('is suggested when effort climbs while reps fall short', () => {
    const note = coachReview(tired(), '2026-12-04').notes.find((n) => n.kind === 'easy');
    expect(note.action).toBe('easy-week');
    expect(note.text).toContain('up from 7.0');
  });

  it('is suggested after two weeks of low check-ins', () => {
    const s = setupState();
    for (const d of ['2026-11-23', '2026-11-25', '2026-11-27', '2026-11-30']) addCheckin(s, d, { energy: 2, sleep: 3 });
    const note = coachReview(s, '2026-12-01').notes.find((n) => n.kind === 'easy');
    expect(note.text).toContain('4 check-ins');
  });

  it('takes one set off every exercise for two sessions, pauses step-ups, then ends', () => {
    const s0 = tired();
    const note = coachReview(s0, '2026-12-04').notes.find((n) => n.kind === 'easy');
    let s = startEasyWeek(s0, note, '2026-12-04');
    expect(coachReview(s, '2026-12-04').notes.some((n) => n.kind === 'easy')).toBe(false);
    expect(coachReview(s, '2026-12-04').notes.some((n) => n.kind === 'easy-on')).toBe(true);
    expect(coachReview(s, '2026-12-04').suggestions.some((x) => x.kind === 'progress')).toBe(false);
    const d = createDraft(s, 'A', '2026-12-08');
    expect(d.easy).toBe(true);
    const plan = currentPlan(s);
    expect(d.exercises[0].target.sets).toBe(plan.sessions.A.exercises[0].sets - 1);
    d.exercises[0].rows.forEach((r) => { r.done = true; });
    const log = finishDraft(d, { nowMs: Date.parse('2026-12-08T18:30:00Z'), id: 'easy-1' });
    expect(log.easy).toBe(true);
    s = afterSessionSaved({ ...s, strengthLogs: [...s.strengthLogs, log] }, log);
    expect(s.easyWeek.sessionsLeft).toBe(1);
    s = afterSessionSaved(s, { ...log, id: 'easy-2' });
    expect(s.easyWeek).toBe(null);
    expect(createDraft(s, 'A', '2026-12-12').easy).toBe(undefined);
  });

  it('"Not now" keeps it away for two weeks', () => {
    const s0 = tired();
    const note = coachReview(s0, '2026-12-04').notes.find((n) => n.kind === 'easy');
    const s = dismissNote(s0, note, '2026-12-04');
    expect(coachReview(s, '2026-12-10').notes.some((n) => n.kind === 'easy')).toBe(false);
  });
});

describe('evolve: shorter rests', () => {
  function maxedPlank() {
    const s = setupState();
    const plan = currentPlan(s);
    const p = plan.sessions.B.exercises.find((x) => x.exerciseId === 'side-plank');
    s.plans.push(withPrescription(plan, 'B', 'side-plank', { ...p, variation: 'Side plank with top-leg raise', min: 50, max: 60, sets: 3, maxSets: 3 }, { today: '2026-11-02', reason: 'test' }));
    addLog(s, 'B', '2026-11-17', { ex: { 'side-plank': { value: 'top', rir: 2 } }, rpe: 7 });
    addLog(s, 'B', '2026-11-19', { ex: { 'side-plank': { value: 'top', rir: 2 } }, rpe: 7 });
    return s;
  }

  it('are suggested when an exercise has nowhere further to go, never below 30 s and 60 s', () => {
    const s = maxedPlank();
    const note = coachReview(s, '2026-11-20').notes.find((n) => n.kind === 'rest');
    expect(note.text).toContain('Side plank with top-leg raise (Session B) has nowhere further to go');
    expect(note.rest).toEqual({ short: 30, long: 60 });
    const after = shortenRests(s, note, '2026-11-20');
    expect([after.settings.restShort, after.settings.restLong]).toEqual([30, 60]);
    expect(coachReview(after, '2026-11-20').notes.some((n) => n.kind === 'rest')).toBe(false);
  });
});
