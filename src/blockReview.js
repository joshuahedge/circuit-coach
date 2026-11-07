// End of block: how the block went, and a short list of changes for the next block (each with a reason,
// each optional). Only what needs changing: stalled exercises, repeated pain, sessions too long or short.
// Nothing changes until the owner starts the next block with the changes they kept.
import { EXERCISES, SAFETY_NOTE } from './library.js';
import { currentPlan, estimateMinutes, ladderIndex, prescriptionLabel, tempoLabel } from './plan.js';
import { blockInfo } from './schedule.js';
import { daysBetween } from './dates.js';
import { startNextBlock } from './coach.js';

const MAX_MINUTES = 40;
const LONG_MINUTES = 42;
const SHORT_MINUTES = 30;
const PER_SESSION = 2;
const PRIORITY = { pain: 1, long: 2, stalled: 3, short: 4 };

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const round1 = (x) => (x === null ? null : Math.round(x * 10) / 10);
const byDate = (a, b) => (a.date === b.date ? String(a.createdAt).localeCompare(String(b.createdAt)) : a.date < b.date ? -1 : 1);
const painFlag = (e) => Boolean(e.pain) || (e.status === 'skipped' && e.reason === 'Pain');

function rxText(p) {
  const t = tempoLabel(p);
  return `${prescriptionLabel(p)}${t ? ` (${t})` : ''}`;
}

function entryAvg(e) {
  return avg((e.sets || []).map((s) => Number(s.value) || 0));
}

export function blockSummary(state, today) {
  const info = blockInfo(state, today);
  const start = state.block.startDate;
  const plan = currentPlan(state);
  const logs = state.strengthLogs.filter((l) => (!start || l.date >= start) && l.date <= today).sort(byDate);
  const weeks = Math.max(1, info.phase === 'review' ? info.week - 1 : info.week);
  const planned = weeks * Object.keys(state.schedule.strengthDays || {}).length;
  const inBlock = (d) => !start || d.at >= start;

  const exercises = [];
  for (const sessionId of ['A', 'B']) {
    for (const p of plan.sessions[sessionId].exercises) {
      const all = logs.filter((l) => l.sessionId === sessionId)
        .map((l) => ({ log: l, entry: (l.exercises || []).find((e) => e.exerciseId === p.exerciseId) }))
        .filter((x) => x.entry);
      const done = all.filter((x) => x.entry.status !== 'skipped' && x.entry.sets && x.entry.sets.length);
      const decided = (kind) => state.decisions.filter((d) => d.sessionId === sessionId && d.exerciseId === p.exerciseId
        && d.kind === kind && (d.status === 'accepted' || d.status === 'edited') && inBlock(d)).length;
      exercises.push({
        sessionId, exerciseId: p.exerciseId, p, name: p.variation, unit: p.unit,
        count: done.length,
        firstAvg: done.length ? round1(entryAvg(done[0].entry)) : null,
        lastAvg: done.length ? round1(entryAvg(done[done.length - 1].entry)) : null,
        firstVariation: done.length ? done[0].entry.variation : null,
        progressions: decided('progress'),
        reductions: decided('reduce'),
        painCount: all.filter((x) => painFlag(x.entry)).length,
      });
    }
  }

  const minutes = (id) => round1(avg(logs.filter((l) => l.sessionId === id && isNum(l.durationMin)).map((l) => l.durationMin)));
  const benches = [...state.benchmarks].sort(byDate);
  const atStart = benches.filter((b) => !start || b.date <= start).pop() || benches[0] || null;
  const latest = benches[benches.length - 1] || null;
  return {
    number: state.block.number || 1,
    startDate: start,
    week: info.week,
    phase: info.phase,
    weeks,
    planned,
    done: logs.length,
    avgEffort: round1(avg(logs.map((l) => l.rpe).filter(isNum))),
    exercises,
    sessionMinutes: { A: minutes('A'), B: minutes('B') },
    bench: {
      start: atStart,
      latest: latest && atStart && latest.id !== atStart.id ? latest : null,
      recent: Boolean(latest && daysBetween(latest.date, today) <= 14),
    },
  };
}

function proposal(rule, blockNumber, sessionId, p, to, title, reason) {
  return { key: `block:${blockNumber}:${rule}:${sessionId}:${p.exerciseId}`, rule, priority: PRIORITY[rule], sessionId, exerciseId: p.exerciseId, from: p, to, title, reason };
}

function withExtraSet(session, exerciseId) {
  return { ...session, exercises: session.exercises.map((x) => (x.exerciseId === exerciseId ? { ...x, sets: x.sets + 1 } : x)) };
}

export function nextBlockProposals(state, today) {
  const summary = blockSummary(state, today);
  const plan = currentPlan(state);
  const notes = [];
  const n = summary.number;

  if (!summary.bench.recent) {
    notes.push({ kind: 'benchmark', action: 'benchmark', text: 'No benchmark tests in the last two weeks. Do them before you start the next block, so you can compare blocks.' });
  }
  for (const ex of summary.exercises.filter((e) => e.progressions >= 2)) {
    notes.push({ kind: 'praise', text: `${ex.name}: stepped up ${ex.progressions} times this block. It stays as it is so the coach can keep building.` });
  }
  const consistency = summary.planned ? summary.done / summary.planned : 1;
  if (consistency < 0.75) {
    notes.push({ kind: 'consistency', text: `You did ${summary.done} of ${summary.planned} planned sessions. Repeat this plan as it is, and pick training days that suit your week better (Plan tab).` });
    return { summary, proposals: [], notes };
  }

  const proposals = [];
  for (const sessionId of ['A', 'B']) {
    const session = plan.sessions[sessionId];
    const cands = [];
    for (const ex of summary.exercises.filter((e) => e.sessionId === sessionId)) {
      const { p } = ex;
      const lib = EXERCISES[p.exerciseId];
      if (ex.painCount >= 2) {
        const swap = lib.swaps.find((s) => s.name !== p.variation);
        if (swap) {
          cands.push(proposal('pain', n, sessionId, p, { ...p, variation: swap.name }, `${p.variation}: swap for ${swap.name}`,
            `You flagged pain on ${p.variation} ${ex.painCount} times this block. ${swap.name} is a gentler option: ${swap.note} ${SAFETY_NOTE}`));
        }
        continue;
      }
      if (ex.count >= 4 && ex.progressions === 0 && ex.painCount === 0) {
        let to = null;
        let change = '';
        if (p.unit === 'seconds') {
          const i = ladderIndex(p);
          const nxt = i >= 0 ? lib.ladder[i + 1] : null;
          if (nxt) { to = { ...p, variation: nxt.name, min: nxt.min, max: nxt.max, sides: nxt.sides || lib.sides }; change = `move to ${nxt.name}`; }
        } else {
          const tempo = Math.min(5, (p.tempoDown || 0) + 1);
          const min = Math.max(1, p.min - 2);
          const max = Math.max(min, p.max - 2);
          if (tempo !== (p.tempoDown || 0) || min !== p.min) { to = { ...p, tempoDown: tempo, min, max }; change = `a slower lowering (${tempo} s) with a lower target`; }
        }
        if (to) {
          const unit = p.unit === 'seconds' ? 's' : 'reps';
          cands.push(proposal('stalled', n, sessionId, p, to, `${p.variation}: a fresh challenge`,
            `No step up on ${p.variation} in ${ex.count} workouts this block (about ${ex.lastAvg} ${unit} a set at the end). Try ${change}: ${rxText(to)}. A new challenge to build on, rather than repeating the same numbers.`));
        }
      }
    }
    const mins = summary.sessionMinutes[sessionId];
    if (mins !== null && mins > LONG_MINUTES) {
      const target = session.exercises.filter((p) => p.sets > 2).sort((a, b) => b.sets - a.sets)[0];
      if (target) {
        cands.push(proposal('long', n, sessionId, target, { ...target, sets: target.sets - 1 }, `${target.variation}: one set fewer`,
          `Session ${sessionId} averaged ${Math.round(mins)} minutes this block, over your 35–40. One set fewer on ${target.variation} brings it back.`));
      }
    } else if (mins !== null && mins < SHORT_MINUTES && consistency >= 1) {
      const target = [...session.exercises].filter((p) => p.sets < (p.maxSets || 3)).sort((a, b) => a.sets - b.sets)
        .find((p) => estimateMinutes(withExtraSet(session, p.exerciseId)) <= MAX_MINUTES);
      if (target) {
        cands.push(proposal('short', n, sessionId, target, { ...target, sets: target.sets + 1 }, `${target.variation}: one more set`,
          `Session ${sessionId} averaged ${Math.round(mins)} minutes and you did every session. One more set on ${target.variation} uses more of your 35–40 minutes.`));
      }
    }
    cands.sort((a, b) => a.priority - b.priority);
    const used = new Set();
    for (const c of cands) {
      if (used.size >= PER_SESSION) break;
      if (used.has(c.exerciseId)) continue;
      used.add(c.exerciseId);
      proposals.push(c);
    }
  }
  return { summary, proposals, notes };
}

// Start the next block with the chosen changes, applied together as one new plan version.
export function applyNextBlock(state, today, chosen) {
  let next = state;
  if (chosen.length) {
    const plan = currentPlan(state);
    const sessions = {
      A: { ...plan.sessions.A, exercises: plan.sessions.A.exercises.map((p) => ({ ...p })) },
      B: { ...plan.sessions.B, exercises: plan.sessions.B.exercises.map((p) => ({ ...p })) },
    };
    for (const c of chosen) {
      sessions[c.sessionId].exercises = sessions[c.sessionId].exercises.map((p) => (p.exerciseId === c.exerciseId ? { ...c.to, since: today } : p));
    }
    const n = (state.block.number || 1) + 1;
    const version = {
      version: plan.version + 1, effectiveFrom: today, createdAt: today, acceptedByUser: true, sessions,
      reason: `Block ${n} plan: ${chosen.map((c) => c.title).join('; ')}`,
      detail: chosen.map((c) => c.reason).join(' '),
    };
    next = {
      ...state,
      plans: [...state.plans, version],
      decisions: [...state.decisions, ...chosen.map((c) => ({
        key: c.key, status: 'accepted', at: today, planVersion: version.version, sessionId: c.sessionId, exerciseId: c.exerciseId, kind: 'block',
      }))],
    };
  }
  return startNextBlock(next, today);
}
