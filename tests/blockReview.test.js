import { describe, it, expect } from './harness.js';
import { blockSummary, nextBlockProposals, applyNextBlock } from '../src/blockReview.js';
import { acceptSuggestion, coachReview } from '../src/coach.js';
import { currentPlan } from '../src/plan.js';
import { addDays } from '../src/dates.js';
import { setupState, addLog } from './fixtures.js';

const REVIEW = '2027-01-01'; // Friday of week 9: the block (2 Nov – 27 Dec) is over

// A full block: Session A on Tuesdays and B on Thursdays for 8 weeks, unless `weeks` says fewer.
function block({ weeks = 8, opts = {}, optsA = {}, optsB = {} } = {}) {
  const s = setupState();
  for (let w = 0; w < weeks; w++) {
    const mon = addDays('2026-11-02', 7 * w);
    addLog(s, 'A', addDays(mon, 1), { ...opts, ...optsA });
    addLog(s, 'B', addDays(mon, 3), { ...opts, ...optsB });
  }
  return s;
}

const find = (r, exerciseId, rule) => r.proposals.find((p) => p.exerciseId === exerciseId && (!rule || p.rule === rule));

describe('block review: summary', () => {
  it('counts sessions, effort and each exercise', () => {
    const s = block({ opts: { rpe: 7 } });
    const sum = blockSummary(s, REVIEW);
    expect(sum.number).toBe(1);
    expect(sum.phase).toBe('review');
    expect(sum.weeks).toBe(8);
    expect(sum.planned).toBe(16);
    expect(sum.done).toBe(16);
    expect(sum.avgEffort).toBe(7);
    const press = sum.exercises.find((e) => e.exerciseId === 'press-up');
    expect(press.count).toBe(8);
    expect(press.firstAvg).toBe(8);
    expect(press.progressions).toBe(0);
    expect(sum.sessionMinutes.A).toBe(36);
  });
});

describe('block review: proposals', () => {
  it('a stalled exercise gets a fresh challenge, at most two per session', () => {
    const r = nextBlockProposals(block(), REVIEW);
    expect(r.proposals.filter((p) => p.sessionId === 'A').length).toBe(2);
    expect(r.proposals.filter((p) => p.sessionId === 'B').length).toBe(2);
    const lunge = find(r, 'reverse-lunge', 'stalled');
    expect(lunge.to.tempoDown).toBe(3);
    expect([lunge.to.min, lunge.to.max]).toEqual([6, 8]);
    expect(lunge.reason).toContain('No step up on Reverse lunge in 8 workouts');
  });

  it('a stalled hold moves to its next version', () => {
    const s = block();
    // Only the side plank stalls in B: the others stepped up during the block.
    for (const id of ['sl-rdl', 'tempo-squat', 'pike-push-up', 'sl-calf-raise']) {
      s.decisions.push({ key: `x-${id}`, status: 'accepted', at: '2026-11-20', sessionId: 'B', exerciseId: id, kind: 'progress' });
    }
    const plank = find(nextBlockProposals(s, REVIEW), 'side-plank', 'stalled');
    expect(plank.to.variation).toBe('Side plank with top-leg raise');
  });

  it('repeated pain swaps for the gentler option first', () => {
    const s = block();
    s.strengthLogs.filter((l) => l.sessionId === 'A').slice(-2).forEach((l) => { l.exercises[1].pain = true; });
    const r = nextBlockProposals(s, REVIEW);
    const p = find(r, 'press-up');
    expect(p.rule).toBe('pain');
    expect(p.to.variation).toBe('Knee press-up');
    expect(p.reason).toContain('not medical care');
    expect(r.proposals.filter((x) => x.sessionId === 'A')[0].rule).toBe('pain');
  });

  it('long sessions lose a set; short complete ones gain one', () => {
    const long = nextBlockProposals(block({ optsA: { durationMin: 45 } }), REVIEW);
    const cut = long.proposals.find((p) => p.rule === 'long');
    expect(cut.sessionId).toBe('A');
    expect(cut.to.sets).toBe(cut.from.sets - 1);

    const quick = block({ optsB: { durationMin: 25 } });
    for (const id of ['sl-rdl', 'tempo-squat', 'pike-push-up', 'sl-calf-raise', 'side-plank']) {
      quick.decisions.push({ key: `q-${id}`, status: 'accepted', at: '2026-11-20', sessionId: 'B', exerciseId: id, kind: 'progress' });
    }
    const short = nextBlockProposals(quick, REVIEW);
    const add = short.proposals.find((p) => p.rule === 'short');
    expect(add.sessionId).toBe('B');
    expect(add.to.sets).toBe(add.from.sets + 1);
  });

  it('exercises that progressed stay, with praise', () => {
    const s = block();
    s.decisions.push({ key: 'p1', status: 'accepted', at: '2026-11-20', sessionId: 'A', exerciseId: 'press-up', kind: 'progress' });
    s.decisions.push({ key: 'p2', status: 'edited', at: '2026-12-04', sessionId: 'A', exerciseId: 'press-up', kind: 'progress' });
    const r = nextBlockProposals(s, REVIEW);
    expect(find(r, 'press-up')).toBe(undefined);
    expect(r.notes.some((n) => n.kind === 'praise' && n.text.includes('stepped up 2 times'))).toBe(true);
  });

  it('few sessions done means no changes, just a note', () => {
    const r = nextBlockProposals(block({ weeks: 5 }), REVIEW);
    expect(r.proposals).toEqual([]);
    expect(r.notes.find((n) => n.kind === 'consistency').text).toContain('10 of 16');
  });

  it('asks for benchmark tests when none are recent', () => {
    const s = block();
    expect(nextBlockProposals(s, REVIEW).notes.some((n) => n.action === 'benchmark')).toBe(true);
    s.benchmarks.push({ id: 'b9', date: '2026-12-28', pressUps: 25 });
    const r = nextBlockProposals(s, REVIEW);
    expect(r.notes.some((n) => n.action === 'benchmark')).toBe(false);
    expect(r.summary.bench.latest.pressUps).toBe(25);
    expect(r.summary.bench.start.pressUps).toBe(20);
  });
});

describe('block review: starting the next block', () => {
  it('applies the chosen changes as one plan version and starts block 2', () => {
    const s = block();
    const { proposals } = nextBlockProposals(s, REVIEW);
    const chosen = proposals.slice(0, 3);
    const next = applyNextBlock(s, REVIEW, chosen);
    expect(next.plans.length).toBe(2);
    const plan = currentPlan(next);
    expect(plan.reason.startsWith('Block 2 plan: ')).toBe(true);
    for (const c of chosen) {
      const p = plan.sessions[c.sessionId].exercises.find((x) => x.exerciseId === c.exerciseId);
      expect(p.tempoDown).toBe(c.to.tempoDown);
      expect(p.since).toBe(REVIEW);
    }
    expect(next.block).toEqual({ number: 2, startDate: '2026-12-28' });
    expect(next.decisions.filter((d) => d.kind === 'block').length).toBe(3);
    expect(coachReview(next, REVIEW).block.phase).toBe('establish');
  });

  it('starting without changes keeps the plan', () => {
    const s = block();
    const next = applyNextBlock(s, REVIEW, []);
    expect(next.plans.length).toBe(1);
    expect(next.block.number).toBe(2);
  });

  it('a change accepted by the coach mid-block counts as progress', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': { value: 'top', rir: 2 } } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': { value: 'top', rir: 2 } } });
    const sug = coachReview(s, '2026-11-20').suggestions.find((x) => x.exerciseId === 'press-up');
    const next = acceptSuggestion(s, sug, '2026-11-20');
    expect(blockSummary(next, REVIEW).exercises.find((e) => e.exerciseId === 'press-up').progressions).toBe(1);
  });
});
