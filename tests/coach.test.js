import { describe, it, expect } from './harness.js';
import { coachReview, acceptSuggestion, rejectSuggestion, dismissNote, startNextBlock, canUndoDecision, undoDecision } from '../src/coach.js';
import { currentPlan, withPrescription } from '../src/plan.js';
import { setupState, addLog, addRun, addCheckin } from './fixtures.js';

const find = (r, exerciseId, rule) => r.suggestions.find((s) => s.exerciseId === exerciseId && (!rule || s.rule === rule));
const top = (rir = 2) => ({ value: 'top', rir });

function setRx(state, sessionId, exerciseId, patch) {
  const plan = currentPlan(state);
  const p = plan.sessions[sessionId].exercises.find((x) => x.exerciseId === exerciseId);
  const next = withPrescription(plan, sessionId, exerciseId, { ...p, ...patch }, { today: '2026-11-02', reason: 'test' });
  state.plans.push(next);
}

describe('coach: phases', () => {
  it('no increases in weeks 1–2', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-03', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-05', { ex: { 'press-up': top() } });
    const r = coachReview(s, '2026-11-06');
    expect(r.suggestions.filter((x) => x.kind === 'progress').length).toBe(0);
  });

  it('build adds a rep with the evidence in the reason', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top() } });
    const r = coachReview(s, '2026-11-20');
    const sug = find(r, 'press-up', 'progress');
    expect(sug.to.min).toBe(9);
    expect(sug.to.max).toBe(13);
    expect(sug.reason).toContain('3 × 12');
    expect(sug.reason).toContain('17 Nov and 19 Nov');
    expect(sug.reason).toContain('2 or more reps in reserve');
  });

  it('build adds two reps when reps in reserve averaged 3 or more', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top(3) } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top(4) } });
    const sug = find(coachReview(s, '2026-11-20'), 'press-up', 'progress');
    expect(sug.to.max).toBe(14);
  });

  it('holds get 5 s longer', () => {
    const s = setupState();
    addLog(s, 'B', '2026-11-17', { ex: { 'side-plank': top() } });
    addLog(s, 'B', '2026-11-19', { ex: { 'side-plank': top() } });
    const r = coachReview(s, '2026-11-20');
    const sug = find(r, 'side-plank', 'progress');
    expect([sug.to.min, sug.to.max]).toEqual([30, 45]);
    expect(r.suggestions.filter((x) => x.sessionId === 'B').length).toBe(1);
  });

  it('at the rep cap, build switches to a lever', () => {
    const s = setupState();
    setRx(s, 'A', 'press-up', { min: 16, max: 20 });
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top() } });
    const sug = find(coachReview(s, '2026-11-20'), 'press-up', 'progress');
    expect(sug.to.tempoDown).toBe(3);
    expect(sug.to.max).toBe(20);
  });

  it('intensify uses tempo, then pause, then a harder version', () => {
    const s = setupState();
    addLog(s, 'A', '2026-12-01', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-12-03', { ex: { 'press-up': top() } });
    expect(find(coachReview(s, '2026-12-04'), 'press-up').to.tempoDown).toBe(3);

    const s2 = setupState();
    setRx(s2, 'A', 'press-up', { tempoDown: 5 });
    addLog(s2, 'A', '2026-12-01', { ex: { 'press-up': top() } });
    addLog(s2, 'A', '2026-12-03', { ex: { 'press-up': top() } });
    expect(find(coachReview(s2, '2026-12-04'), 'press-up').to.pause).toBe(1);

    const s3 = setupState();
    setRx(s3, 'A', 'press-up', { tempoDown: 5, pause: 3 });
    addLog(s3, 'A', '2026-12-01', { ex: { 'press-up': top() } });
    addLog(s3, 'A', '2026-12-03', { ex: { 'press-up': top() } });
    const sug = find(coachReview(s3, '2026-12-04'), 'press-up');
    expect(sug.to.variation).toBe('Close-grip press-up');
    expect([sug.to.min, sug.to.max]).toEqual([6, 10]);
  });

  it('an extra set only when the session stays inside 40 minutes', () => {
    const s = setupState();
    setRx(s, 'A', 'sl-glute-bridge', { tempoDown: 5, pause: 3, variation: 'Single-leg glute bridge, heel further away' });
    addLog(s, 'A', '2026-12-01', { ex: { 'sl-glute-bridge': top() } });
    addLog(s, 'A', '2026-12-03', { ex: { 'sl-glute-bridge': top() } });
    expect(find(coachReview(s, '2026-12-04'), 'sl-glute-bridge').to.sets).toBe(3);

    const slow = setupState();
    setRx(slow, 'A', 'sl-glute-bridge', { tempoDown: 5, pause: 3, variation: 'Single-leg glute bridge, heel further away' });
    addLog(slow, 'A', '2026-12-01', { ex: { 'sl-glute-bridge': top() }, durationMin: 45 });
    addLog(slow, 'A', '2026-12-03', { ex: { 'sl-glute-bridge': top() }, durationMin: 44 });
    expect(find(coachReview(slow, '2026-12-04'), 'sl-glute-bridge')).toBe(undefined);

    const long = setupState();
    setRx(long, 'A', 'prone-ytw', { tempoDown: 5, pause: 3 });
    addLog(long, 'A', '2026-12-01', { ex: { 'prone-ytw': top() } });
    addLog(long, 'A', '2026-12-03', { ex: { 'prone-ytw': top() } });
    expect(find(coachReview(long, '2026-12-04'), 'prone-ytw')).toBe(undefined);
  });

  it('consolidate adds one rep only', () => {
    const s = setupState();
    addLog(s, 'A', '2026-12-15', { ex: { 'press-up': top(3) } });
    addLog(s, 'A', '2026-12-17', { ex: { 'press-up': top(3) } });
    const sug = find(coachReview(s, '2026-12-18'), 'press-up');
    expect(sug.to.max).toBe(13);
  });

  it('after week 8 there is a block review and no increases', () => {
    const s = setupState();
    addLog(s, 'A', '2026-12-29', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-12-31', { ex: { 'press-up': top() } });
    const r = coachReview(s, '2027-01-01');
    expect(r.suggestions.length).toBe(0);
    const note = r.notes.find((n) => n.kind === 'block');
    expect(note.action).toBe('start-block');
    const next = startNextBlock(s, '2027-01-01');
    expect(next.block).toEqual({ number: 2, startDate: '2026-12-28' });
  });
});

describe('coach: readiness', () => {
  it('uses session effort when reps in reserve were not logged', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top(null) }, rpe: 7 });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top(null) }, rpe: 6 });
    const sug = find(coachReview(s, '2026-11-20'), 'press-up');
    expect(sug.reason).toContain('effort of 7/10 or less');

    const hard = setupState();
    addLog(hard, 'A', '2026-11-17', { ex: { 'press-up': top(null) }, rpe: 8 });
    addLog(hard, 'A', '2026-11-19', { ex: { 'press-up': top(null) }, rpe: 7 });
    expect(find(coachReview(hard, '2026-11-20'), 'press-up')).toBe(undefined);
  });

  it('one short set means not ready', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': { value: 11, rir: 2 } } });
    expect(find(coachReview(s, '2026-11-20'), 'press-up')).toBe(undefined);
  });

  it('run-protected sessions do not count towards progress for the trimmed exercises', () => {
    const s = setupState();
    addLog(s, 'B', '2026-11-17', { ex: { 'sl-rdl': top() } });
    addLog(s, 'B', '2026-11-19', { ex: { 'sl-rdl': top() }, runProtect: true });
    expect(find(coachReview(s, '2026-11-20'), 'sl-rdl')).toBe(undefined);
  });

  it('only logs of the current prescription count', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top() } });
    const sug = find(coachReview(s, '2026-11-20'), 'press-up');
    const after = acceptSuggestion(s, sug, '2026-11-20');
    expect(find(coachReview(after, '2026-11-20'), 'press-up')).toBe(undefined);
  });
});

describe('coach: holding back', () => {
  it('pain suggests an easier version with the safety line', () => {
    const s = setupState();
    addLog(s, 'B', '2026-11-05', { ex: { 'pike-push-up': { value: 'min', rir: 2, pain: true } } });
    const sug = find(coachReview(s, '2026-11-06'), 'pike-push-up', 'pain');
    expect(sug.to.variation).toBe('Pike push-up, more upright');
    expect(sug.kind).toBe('reduce');
    expect(sug.reason).toContain('not medical care');
  });

  it('pain on a swapped or skipped exercise still blocks progress and eases off', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top() } });
    const swapped = addLog(s, 'A', '2026-11-20');
    Object.assign(swapped.exercises[1], { status: 'modified', variation: 'Knee press-up', pain: true });
    let r = coachReview(s, '2026-11-21');
    expect(find(r, 'press-up', 'progress')).toBe(undefined);
    expect(find(r, 'press-up', 'pain').to.sets).toBe(2);

    const k = setupState();
    addLog(k, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(k, 'A', '2026-11-19', { ex: { 'press-up': top() } });
    const skipped = addLog(k, 'A', '2026-11-20');
    Object.assign(skipped.exercises[1], { status: 'skipped', reason: 'Pain', sets: [] });
    r = coachReview(k, '2026-11-21');
    expect(find(r, 'press-up', 'progress')).toBe(undefined);
    expect(find(r, 'press-up', 'pain').reason).toContain('because of pain');
  });

  it('a pain note in a later session blocks progress', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-20', { ex: { 'press-up': { value: 'min', rir: 2 } }, pain: 'sore shoulder' });
    expect(find(coachReview(s, '2026-11-21'), 'press-up', 'progress')).toBe(undefined);
  });

  it('old evidence does not count after a break', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top() } });
    expect(Boolean(find(coachReview(s, '2026-12-03'), 'press-up'))).toBe(true);
    expect(find(coachReview(s, '2026-12-04'), 'press-up')).toBe(undefined);
  });

  it('pain on the first rung drops a set', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-05', { ex: { 'press-up': { value: 'min', rir: 2, pain: true } } });
    expect(find(coachReview(s, '2026-11-06'), 'press-up', 'pain').to.sets).toBe(2);
  });

  it('missed reps in 2 of the last 3 logs lower the range', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-03', { ex: { 'press-up': { value: 7 } } });
    addLog(s, 'A', '2026-11-05', { ex: { 'press-up': { value: 7 } } });
    const sug = find(coachReview(s, '2026-11-06'), 'press-up', 'missed');
    expect([sug.to.min, sug.to.max]).toEqual([6, 10]);
  });

  it('unfinished sets count as missed', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-03', { ex: { 'press-up': { value: 'min', sets: 2 } } });
    addLog(s, 'A', '2026-11-05', { ex: { 'press-up': { value: 'min', sets: 2 } } });
    expect(Boolean(find(coachReview(s, '2026-11-06'), 'press-up', 'missed'))).toBe(true);
  });

  it('two sessions at effort 9+ drop a set on the biggest exercise', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-03', { rpe: 9 });
    addLog(s, 'A', '2026-11-05', { rpe: 10 });
    const sug = coachReview(s, '2026-11-06').suggestions.find((x) => x.rule === 'effort');
    expect(sug.exerciseId).toBe('reverse-lunge');
    expect(sug.to.sets).toBe(2);
  });

  it('a run hurt by sore legs pauses leg progress and lightens the session before it', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top(), 'reverse-lunge': top() } });
    addRun(s, '2026-11-18', { type: 'tempo', affected: true });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top(), 'reverse-lunge': top() } });
    const r = coachReview(s, '2026-11-20');
    expect(find(r, 'reverse-lunge', 'progress')).toBe(undefined);
    expect(find(r, 'reverse-lunge', 'run-affected').to.sets).toBe(2);
    expect(Boolean(find(r, 'press-up', 'progress'))).toBe(true);
    expect(r.notes.some((n) => n.title === 'Leg increases paused')).toBe(true);
  });

  it('high leg soreness in a check-in pauses leg progress', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'reverse-lunge': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'reverse-lunge': top() } });
    addCheckin(s, '2026-11-20', { legSoreness: 4 });
    expect(find(coachReview(s, '2026-11-20'), 'reverse-lunge')).toBe(undefined);
  });

  it('low energy or sleep pauses every increase', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top() } });
    addCheckin(s, '2026-11-18', { energy: 2 });
    addCheckin(s, '2026-11-19', { energy: 2 });
    addCheckin(s, '2026-11-20', { energy: 1 });
    const r = coachReview(s, '2026-11-20');
    expect(r.suggestions.length).toBe(0);
    expect(r.notes.some((n) => n.title === 'Recovery looks low')).toBe(true);
  });
});

describe('coach: limits and decisions', () => {
  it('at most two per session, holding back first', () => {
    const all = { 'reverse-lunge': top(), 'press-up': top(), 'sl-glute-bridge': top(), 'prone-ytw': top(), 'dead-bug': top() };
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: all });
    addLog(s, 'A', '2026-11-19', { ex: all });
    expect(coachReview(s, '2026-11-20').suggestions.length).toBe(2);

    const p = setupState();
    addLog(p, 'A', '2026-11-17', { ex: all });
    addLog(p, 'A', '2026-11-19', { ex: { ...all, 'dead-bug': { value: 'top', rir: 2, pain: true } } });
    const r = coachReview(p, '2026-11-20');
    expect(r.suggestions.length).toBe(2);
    expect(r.suggestions[0].rule).toBe('pain');
    expect(r.suggestions[0].exerciseId).toBe('dead-bug');
    expect(r.suggestions[1].kind).toBe('progress');
  });

  it('accepting makes a plan version and a decision', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top() } });
    const sug = find(coachReview(s, '2026-11-20'), 'press-up');
    const next = acceptSuggestion(s, sug, '2026-11-20');
    expect(next.plans.length).toBe(2);
    const plan = currentPlan(next);
    expect(plan.version).toBe(2);
    expect(plan.reason).toBe('Press-up: add a rep');
    expect(plan.detail).toBe(sug.reason);
    expect(plan.sessions.A.exercises[1].max).toBe(13);
    expect(next.decisions[0].status).toBe('accepted');
    expect(next.decisions[0].planVersion).toBe(2);
    expect(s.plans.length).toBe(1);
  });

  it('editing uses your values', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top() } });
    const sug = find(coachReview(s, '2026-11-20'), 'press-up');
    const next = acceptSuggestion(s, sug, '2026-11-20', { ...sug.to, min: 10, max: 12 });
    expect(currentPlan(next).sessions.A.exercises[1].min).toBe(10);
    expect(currentPlan(next).reason).toContain('edited by you');
    expect(next.decisions[0].status).toBe('edited');
  });

  it('every suggestion shows the numbers behind it', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top(3) } });
    const sug = find(coachReview(s, '2026-11-20'), 'press-up');
    expect(sug.details).toEqual(['17 Nov: 12 12 12 (RIR 2)', '19 Nov: 12 12 12 (RIR 3)']);
    const lunge = setupState();
    addLog(lunge, 'A', '2026-11-03', { ex: { 'reverse-lunge': { value: 7 } } });
    addLog(lunge, 'A', '2026-11-05', { ex: { 'reverse-lunge': { value: 7 } } });
    expect(find(coachReview(lunge, '2026-11-06'), 'reverse-lunge', 'missed').details[0]).toBe('3 Nov: L 7 7 7 · R 7 7 7 (RIR 1)');
  });

  it('a decision can be undone while its plan version is the latest', () => {
    const all = { 'press-up': top(), 'dead-bug': top() };
    let s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: all });
    addLog(s, 'A', '2026-11-19', { ex: all });
    const [a, b] = coachReview(s, '2026-11-20').suggestions;
    s = acceptSuggestion(s, a, '2026-11-20');
    expect(canUndoDecision(s, a.key)).toBe(true);
    s = acceptSuggestion(s, b, '2026-11-20');
    expect(canUndoDecision(s, a.key)).toBe(false);
    s = undoDecision(s, b.key);
    expect(s.plans.length).toBe(2);
    expect(s.decisions.length).toBe(1);
    expect(coachReview(s, '2026-11-20').suggestions.some((x) => x.key === b.key)).toBe(true);
    s = rejectSuggestion(s, b, '2026-11-20');
    s = undoDecision(s, b.key);
    expect(s.decisions.length).toBe(1);
  });

  it('rejecting hides it until there is new evidence', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': top() } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': top() } });
    const sug = find(coachReview(s, '2026-11-20'), 'press-up');
    const next = rejectSuggestion(s, sug, '2026-11-20');
    expect(next.plans.length).toBe(1);
    expect(find(coachReview(next, '2026-11-20'), 'press-up')).toBe(undefined);
    addLog(next, 'A', '2026-11-24', { ex: { 'press-up': top() } });
    const again = find(coachReview(next, '2026-11-25'), 'press-up');
    expect(Boolean(again)).toBe(true);
    expect(again.key === sug.key).toBe(false);
  });

  it('two accepted increases in a week use up that session\'s room', () => {
    const all = { 'reverse-lunge': top(), 'press-up': top(), 'sl-glute-bridge': top(), 'prone-ytw': top(), 'dead-bug': top() };
    let s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: all });
    addLog(s, 'A', '2026-11-19', { ex: all });
    const [a, b] = coachReview(s, '2026-11-20').suggestions;
    s = acceptSuggestion(s, a, '2026-11-20');
    s = acceptSuggestion(s, b, '2026-11-20');
    expect(coachReview(s, '2026-11-20').suggestions.filter((x) => x.sessionId === 'A').length).toBe(0);
    expect(coachReview(s, '2026-11-28').suggestions.filter((x) => x.sessionId === 'A').length).toBe(2);
  });
});

describe('coach: notes', () => {
  it('0 reps in reserve twice means hold', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-03', { ex: { 'press-up': { value: 'min', rir: 0 } } });
    addLog(s, 'A', '2026-11-05', { ex: { 'press-up': { value: 'min', rir: 0 } } });
    expect(coachReview(s, '2026-11-06').notes.some((n) => n.title === 'Hold Press-up')).toBe(true);
  });

  it('runs that feel harder at the same pace', () => {
    const s = setupState();
    for (const d of ['2026-11-02', '2026-11-04', '2026-11-07']) addRun(s, d, { rpe: 4 });
    for (const d of ['2026-11-09', '2026-11-11']) addRun(s, d, { rpe: 6 });
    const n = coachReview(s, '2026-11-12').notes.find((x) => x.kind === 'running');
    expect(n.text).toContain('sleep, stress, illness');
  });

  it('a big jump in weekly km', () => {
    const s = setupState();
    for (const w of ['2026-11-02', '2026-11-09', '2026-11-16']) addRun(s, w, { km: 15, sec: 5850 });
    addRun(s, '2026-11-23', { km: 12 });
    addRun(s, '2026-11-25', { km: 10 });
    const r = coachReview(s, '2026-11-26');
    expect(r.notes.some((x) => x.title === 'Big jump in running')).toBe(true);
  });

  it('benchmark due after 4 weeks, overdue after 8', () => {
    const s = setupState();
    expect(coachReview(s, '2026-11-29').notes.some((n) => n.kind === 'benchmark')).toBe(false);
    expect(coachReview(s, '2026-11-30').notes.find((n) => n.kind === 'benchmark').title).toBe('Benchmark tests due');
    expect(coachReview(s, '2026-12-28').notes.find((n) => n.kind === 'benchmark').level).toBe('warn');
  });

  it('schedule warnings and dismissing a note', () => {
    const s = setupState({ strengthDays: { tue: 'A', fri: 'B' } });
    const r = coachReview(s, '2026-11-04');
    const n = r.notes.find((x) => x.kind === 'schedule' && x.level === 'warn');
    expect(n.text).toContain('day before your long run');
    expect(r.notes.some((x) => x.kind === 'schedule' && x.level === 'info' && x.text.includes('quality run'))).toBe(true);
    const after = dismissNote(s, n, '2026-11-04');
    expect(coachReview(after, '2026-11-04').notes.some((x) => x.key === n.key)).toBe(false);
  });

  it('nothing before setup', () => {
    const s = setupState();
    s.setupDone = false;
    expect(coachReview(s, '2026-11-20').suggestions).toEqual([]);
  });
});
