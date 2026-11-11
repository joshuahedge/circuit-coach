// End of block: how the block went, and a short list of changes for the next block (each with a reason,
// each optional). Fixes first: stalled exercises, repeated pain, sessions too long or short. Then one fresh
// exercise per session for variety, and, after two well-attended blocks, an optional short Session C (off
// unless switched on). Nothing changes until the owner starts the next block with the changes they kept.
import { AREAS, EXERCISES, exerciseById, useExercises, SAFETY_NOTE } from './library.js';
import {
  currentPlan, estimateMinutes, ladderIndex, prescriptionLabel, sessionIds, startingPrescription, targetMinutes, tempoLabel, SESSION_INFO,
} from './plan.js';
import { blockInfo } from './schedule.js';
import { DAY_KEYS, DAY_NAMES, addDays, daysBetween } from './dates.js';
import { startNextBlock } from './coach.js';

// A session runs long above its time target + 2 minutes, and short below the target - 10.
const PER_SESSION = 2;
const PRIORITY = { pain: 1, long: 2, stalled: 3, short: 4, fresh: 5, third: 6 };
const THIRD_SESSION_RATE = 0.9; // share of planned sessions done over the last two blocks

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
  useExercises(state);
  const info = blockInfo(state, today);
  const start = state.block.startDate;
  const plan = currentPlan(state);
  const logs = state.strengthLogs.filter((l) => (!start || l.date >= start) && l.date <= today).sort(byDate);
  const weeks = Math.max(1, info.phase === 'review' ? info.week - 1 : info.week);
  const planned = weeks * Object.keys(state.schedule.strengthDays || {}).length;
  const inBlock = (d) => !start || d.at >= start;

  const exercises = [];
  for (const sessionId of sessionIds(plan)) {
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
    sessionMinutes: Object.fromEntries(sessionIds(plan).map((id) => [id, minutes(id)])),
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

// Exercises in any plan version so far: a fresh exercise prefers one you have never had.
function everPlanned(state) {
  return new Set(state.plans.flatMap((v) => Object.values(v.sessions).flatMap((s) => s.exercises.map((p) => p.exerciseId))));
}

function inPlan(plan) {
  return new Set(sessionIds(plan).flatMap((id) => plan.sessions[id].exercises.map((p) => p.exerciseId)));
}

// Built-in exercises not in the plan that match (same focus first, then the same area), new-to-you first.
function freshPool(plan, everHad, { focus, area }) {
  const taken = inPlan(plan);
  const free = Object.values(EXERCISES).filter((ex) => !taken.has(ex.id));
  const rank = (list) => [...list.filter((ex) => !everHad.has(ex.id)), ...list.filter((ex) => everHad.has(ex.id))];
  return [...rank(free.filter((ex) => focus && ex.focus === focus)), ...rank(free.filter((ex) => ex.area === area && ex.focus !== focus))];
}

// One fresh exercise per session, outside the two-fixes limit: the one with the fewest step-ups this block
// (done at least twice) swaps for a new one working the same muscles. Your own exercises are never swapped out.
function freshProposal(state, plan, sessionId, session, summary, n, today, skip = new Set()) {
  const rows = summary.exercises.filter((e) => e.sessionId === sessionId && e.count >= 2 && !skip.has(e.exerciseId))
    .filter((e) => { const ex = exerciseById(e.exerciseId); return ex && !ex.custom; })
    .sort((a, b) => a.progressions - b.progressions || b.count - a.count);
  const row = rows[0];
  if (!row) return null;
  const ex = exerciseById(row.exerciseId);
  const pick = freshPool(plan, everPlanned(state), ex)[0];
  if (!pick) return null;
  const to = startingPrescription(pick.id, today);
  const area = AREAS.find((a) => a.id === pick.area);
  const how = row.progressions ? `${row.progressions} step${row.progressions > 1 ? 's' : ''} up` : 'no step up';
  return proposal('fresh', n, sessionId, row.p, to, `Fresh exercise: ${row.p.variation} → ${pick.name}`,
    `You did ${row.p.variation} ${row.count} times this block (${how}). For variety, ${pick.name} works the same area (${area ? area.label.toLowerCase() : pick.area}): ${pick.note.replace(/\.$/, '').toLowerCase()}. It starts at ${rxText(to)}. Your history for ${row.p.variation} stays in Progress.`);
}

// The day for a new session: free, and as far as possible from the days already used.
function freeDay(strengthDays) {
  const used = DAY_KEYS.filter((d) => strengthDays[d]).map((d) => DAY_KEYS.indexOf(d));
  const gap = (i) => Math.min(...used.map((j) => Math.min(Math.abs(i - j), 7 - Math.abs(i - j))));
  const free = DAY_KEYS.map((d, i) => ({ d, i })).filter(({ d }) => !strengthDays[d]);
  if (!free.length) return null;
  free.sort((a, b) => gap(b.i) - gap(a.i) || a.i - b.i);
  return free[0].d;
}

// After two blocks with nearly every session done: an optional short Session C, one exercise per area that A
// and B do not already use, two sets each, on the free day furthest from the others.
function thirdSessionProposal(state, plan, summary, n, today) {
  if (plan.sessions.C || n < 2 || !summary.startDate) return null;
  const days = state.schedule.strengthDays || {};
  const perWeek = Object.keys(days).length;
  if (perWeek < 2) return null;
  const from = addDays(summary.startDate, -56);
  const planned = (summary.weeks + 8) * perWeek;
  const done = state.strengthLogs.filter((l) => l.date >= from && l.date <= today).length;
  if (done < planned * THIRD_SESSION_RATE) return null;
  const day = freeDay(days);
  if (!day) return null;
  const everHad = everPlanned(state);
  const ids = [];
  for (const a of AREAS) {
    const pick = freshPool({ sessions: { ...plan.sessions, C: { exercises: ids.map((id) => ({ exerciseId: id })) } } }, everHad, { area: a.id })[0];
    if (pick) ids.push(pick.id);
  }
  if (ids.length < 3) return null;
  const exercises = ids.map((id) => { const p = startingPrescription(id, today); return { ...p, sets: Math.min(p.sets, 2) }; });
  const session = { id: 'C', ...SESSION_INFO.C, targetMin: 30, exercises };
  return {
    key: `block:${n}:third:C`, rule: 'third', kind: 'third-session', priority: PRIORITY.third, sessionId: 'C', exerciseId: null,
    defaultOff: true, addSession: { session, day },
    title: `Add a short Session C on ${DAY_NAMES[day]}s`,
    reason: `You did ${done} of ${planned} planned sessions over the last two blocks. A short third circuit (about ${estimateMinutes(session)} min) adds training without changing A or B. It stays off unless you switch it on, and you can edit or remove it any time in Plan.`,
  };
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
  for (const sessionId of sessionIds(plan)) {
    const session = plan.sessions[sessionId];
    const cands = [];
    for (const ex of summary.exercises.filter((e) => e.sessionId === sessionId)) {
      const { p } = ex;
      const lib = exerciseById(p.exerciseId);
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
    const goal = targetMinutes(session);
    if (mins !== null && mins > goal + 2) {
      const target = session.exercises.filter((p) => p.sets > 2).sort((a, b) => b.sets - a.sets)[0];
      if (target) {
        cands.push(proposal('long', n, sessionId, target, { ...target, sets: target.sets - 1 }, `${target.variation}: one set fewer`,
          `Session ${sessionId} averaged ${Math.round(mins)} minutes this block, over your ${goal}-minute target. One set fewer on ${target.variation} brings it back.`));
      }
    } else if (mins !== null && mins < goal - 10 && consistency >= 1) {
      const target = [...session.exercises].filter((p) => p.sets < (p.maxSets || 3)).sort((a, b) => a.sets - b.sets)
        .find((p) => estimateMinutes(withExtraSet(session, p.exerciseId)) <= goal);
      if (target) {
        cands.push(proposal('short', n, sessionId, target, { ...target, sets: target.sets + 1 }, `${target.variation}: one more set`,
          `Session ${sessionId} averaged ${Math.round(mins)} minutes and you did every session. One more set on ${target.variation} uses more of your ${goal} minutes.`));
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
    // Variety has its own slot, on an exercise no fix above is changing.
    const fresh = freshProposal(state, plan, sessionId, session, summary, n, today, used);
    if (fresh) proposals.push(fresh);
  }
  const third = thirdSessionProposal(state, plan, summary, n, today);
  if (third) proposals.push(third);
  return { summary, proposals, notes };
}

// Start the next block with the chosen changes, applied together as one new plan version.
export function applyNextBlock(state, today, chosen) {
  let next = state;
  if (chosen.length) {
    const plan = currentPlan(state);
    const sessions = Object.fromEntries(sessionIds(plan).map((id) => [id, { ...plan.sessions[id], exercises: plan.sessions[id].exercises.map((p) => ({ ...p })) }]));
    for (const c of chosen) {
      if (c.kind === 'third-session') {
        sessions.C = { ...c.addSession.session, exercises: c.addSession.session.exercises.map((p) => ({ ...p, since: today })) };
        continue;
      }
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
    const third = chosen.find((c) => c.kind === 'third-session');
    if (third) next = { ...next, schedule: { ...next.schedule, strengthDays: { ...next.schedule.strengthDays, [third.addSession.day]: 'C' } } };
  }
  return startNextBlock(next, today);
}
