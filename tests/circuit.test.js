import { describe, it, expect } from './harness.js';
import { balanceGaps, editSummary, ownExerciseProblem, sessionChanged, timeCheck } from '../src/circuit.js';
import { currentPlan, startingPrescription, withSession, targetMinutes, estimateMinutes } from '../src/plan.js';
import { exerciseById, setCustomExercises, useExercises } from '../src/library.js';
import { coachReview } from '../src/coach.js';
import { createDraft } from '../src/draft.js';
import { nextBlockProposals } from '../src/blockReview.js';
import { setupState, addLog } from './fixtures.js';

const copy = (s) => ({ ...s, exercises: s.exercises.map((p) => ({ ...p })) });
const OWN = { id: 'own-1', name: 'Wide press-up', unit: 'reps', sides: false, area: 'push', sets: 3, min: 8, max: 12 };

describe('circuit editor: rules', () => {
  it('finds areas a session leaves out, with built-in ideas to fill them', () => {
    const plan = currentPlan(setupState());
    expect(balanceGaps(plan, 'A').length).toBe(0);
    const b = balanceGaps(plan, 'B');
    expect(b.map((g) => g.area)).toEqual(['back']);
    expect(b[0].text).toBe('No upper back work in this session.');
    expect(b[0].ideas.length).toBe(2);
    expect(b[0].ideas.some((ex) => ex.id === 'prone-ytw')).toBe(false); // ones in neither session come first
    const noCore = { ...plan.sessions.A, exercises: plan.sessions.A.exercises.filter((p) => p.exerciseId !== 'dead-bug') };
    expect(balanceGaps(plan, 'A', noCore).map((g) => g.area)).toEqual(['core']);
  });

  it('summarises an edit in plain words', () => {
    const plan = currentPlan(setupState());
    const before = plan.sessions.A;
    const after = copy(before);
    after.exercises = after.exercises.filter((p) => p.exerciseId !== 'dead-bug');
    after.exercises.push(startingPrescription('side-plank', '2026-11-10'));
    after.exercises[0] = { ...after.exercises[0], sets: 4 };
    [after.exercises[1], after.exercises[2]] = [after.exercises[2], after.exercises[1]];
    after.targetMin = 50;
    expect(editSummary(before, after)).toBe('added Side plank; removed Dead bug; changed Reverse lunge (4 × 8–10 per leg); new order; target 50 min');
    expect(sessionChanged(before, copy(before))).toBe(false);
  });

  it('warns when the estimate is over the time target', () => {
    const plan = currentPlan(setupState());
    const a = copy(plan.sessions.A);
    expect(targetMinutes(a)).toBe(40);
    expect(timeCheck(a).over).toBe(estimateMinutes(a) > 40);
    a.exercises.push(startingPrescription('side-plank', '2026-11-10'), startingPrescription('tempo-squat', '2026-11-10'));
    expect(timeCheck(a).over).toBe(true);
    a.targetMin = 60;
    expect(timeCheck(a).over).toBe(estimateMinutes(a) > 60);
  });

  it('checks your own exercise before saving it', () => {
    expect(ownExerciseProblem({ ...OWN, name: ' ' })).toBe('Give it a name.');
    expect(ownExerciseProblem({ ...OWN, name: 'Burpees' })).toContain('burpees and mountain climbers');
    expect(ownExerciseProblem({ ...OWN, name: 'side plank' })).toContain('Side plank is already built in');
    expect(ownExerciseProblem({ ...OWN, min: 12, max: 8 })).toContain('bottom of the range');
    expect(ownExerciseProblem(OWN, [OWN])).toBe('You already have an exercise with that name.');
    expect(ownExerciseProblem(OWN)).toBe('');
  });

  it('saving a session keeps the dates of what did not change', () => {
    const plan = currentPlan(setupState());
    const after = copy(plan.sessions.A);
    after.exercises[1] = { ...after.exercises[1], sets: 4 };
    after.exercises.push(startingPrescription('side-plank', '2026-11-10'));
    const next = withSession(plan, 'A', after, { today: '2026-11-10', reason: 'test' });
    expect(next.version).toBe(plan.version + 1);
    expect(next.sessions.A.exercises[0].since).toBe(plan.sessions.A.exercises[0].since);
    expect(next.sessions.A.exercises[1].since).toBe('2026-11-10');
    expect(next.sessions.A.exercises[5].since).toBe('2026-11-10');
    expect(next.sessions.B).toEqual(plan.sessions.B);
  });
});

describe('circuit editor: your own exercises', () => {
  it('are found by every lookup once registered, and logged like any other', () => {
    const s = setupState();
    s.customExercises = [OWN];
    useExercises(s);
    const ex = exerciseById('own-1');
    expect(ex.name).toBe('Wide press-up');
    expect(ex.custom).toBe(true);
    const p = startingPrescription('own-1', '2026-11-10');
    expect(p.variation).toBe('Wide press-up');
    expect(p.sides).toBe(null);
    const plan = currentPlan(s);
    s.plans.push(withSession(plan, 'B', { ...plan.sessions.B, exercises: [...plan.sessions.B.exercises, p] }, { today: '2026-11-10', reason: 'test' }));
    setCustomExercises([]);
    const d = createDraft(s, 'B', '2026-11-12');
    expect(d.exercises[5].variation).toBe('Wide press-up');
    expect(d.exercises[5].rows.length).toBe(3);
  });

  it('the coach adds reps to them in the build weeks, then a set', () => {
    const s = setupState();
    s.customExercises = [{ ...OWN, max: 25, min: 21 }];
    useExercises(s);
    const plan = currentPlan(s);
    const p = { ...startingPrescription('own-1', '2026-11-02'), since: '2026-11-02' };
    s.plans.push(withSession(plan, 'B', { ...plan.sessions.B, exercises: [...plan.sessions.B.exercises, { ...p, min: 8, max: 12 }] }, { today: '2026-11-02', reason: 'test' }));
    addLog(s, 'B', '2026-11-17', { ex: { 'own-1': { value: 'top', rir: 2 } } });
    addLog(s, 'B', '2026-11-19', { ex: { 'own-1': { value: 'top', rir: 2 } } });
    const sug = coachReview(s, '2026-11-20').suggestions.find((x) => x.exerciseId === 'own-1');
    expect(sug.to.max).toBe(13);
    expect(sug.title).toContain('Wide press-up');
  });

  it('the block review works with them in the plan', () => {
    const s = setupState({ start: '2026-09-07' });
    s.customExercises = [OWN];
    useExercises(s);
    const plan = currentPlan(s);
    s.plans.push(withSession(plan, 'A', { ...plan.sessions.A, exercises: [...plan.sessions.A.exercises, startingPrescription('own-1', '2026-09-07')] }, { today: '2026-09-07', reason: 'test' }));
    const r = nextBlockProposals(s, '2026-11-02');
    expect(Array.isArray(r.proposals)).toBe(true);
  });
});
