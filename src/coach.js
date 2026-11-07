// The coach: fixed, explainable rules over the logs. It never changes the plan itself; it returns
// suggestions (each with a reason and the logs behind it) and notes. Accepting one makes a new plan version.
import { EXERCISES, SAFETY_NOTE } from './library.js';
import {
  currentPlan, estimateMinutes, ladderIndex, prescriptionLabel, sideText, tempoLabel, withPrescription,
} from './plan.js';
import { blockInfo, scheduleWarnings, RUN_TYPE_LABEL } from './schedule.js';
import { addDays, daysBetween, formatShort, weekStart } from './dates.js';
import { formatPace, paceSecPerKm } from './pace.js';

const MAX_MINUTES = 40;
const PRIORITY = { pain: 1, 'run-affected': 2, effort: 3, missed: 4, progress: 5 };

const within = (date, today, days) => {
  const d = daysBetween(date, today);
  return d >= 0 && d < days;
};
const byDate = (a, b) => (a.date === b.date ? String(a.createdAt || a.id).localeCompare(String(b.createdAt || b.id)) : a.date < b.date ? -1 : 1);
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const sidesOf = (t) => (t.sides && t.sides.length ? t.sides : [null]);
const exName = (p) => p.variation || EXERCISES[p.exerciseId].name;
const dateList = (logs) => logs.map((l) => formatShort(l.date)).join(' and ');

export function recoveryFlags(state, today) {
  const recent = state.checkins.filter((c) => within(c.date, today, 7)).sort(byDate).slice(-3);
  const energy = avg(recent.map((c) => c.energy).filter(isNum));
  const sleep = avg(recent.map((c) => c.sleep).filter(isNum));
  const lowRecovery = recent.length > 0 && ((energy !== null && energy <= 2) || (sleep !== null && sleep <= 2));
  const soreChecks = state.checkins.filter((c) => within(c.date, today, 7) && isNum(c.legSoreness) && c.legSoreness >= 4);
  const affectedRuns = state.runLogs.filter((r) => r.sorenessAffected === true && within(r.date, today, 14));
  return {
    recent, energy, sleep, lowRecovery, soreChecks, affectedRuns,
    legBlock: soreChecks.length > 0 || affectedRuns.length > 0,
  };
}

function targetMatches(t, p) {
  return t && t.variation === p.variation && t.min === p.min && t.max === p.max && t.unit === p.unit
    && (t.tempoDown || 0) === (p.tempoDown || 0) && (t.pause || 0) === (p.pause || 0)
    && JSON.stringify(t.sides || null) === JSON.stringify(p.sides || null);
}

// Logs of this session that trained this exact prescription (sets may differ: run-protected days).
function matchingEntries(state, sessionId, p) {
  const out = [];
  for (const log of state.strengthLogs) {
    if (log.sessionId !== sessionId || log.date < p.since) continue;
    const entry = (log.exercises || []).find((e) => e.exerciseId === p.exerciseId);
    if (!entry || entry.status !== 'done' || !targetMatches(entry.target, p)) continue;
    out.push({ log, entry, full: entry.target.sets === p.sets });
  }
  return out.sort((a, b) => byDate(a.log, b.log));
}

function entryClean(entry) {
  const t = entry.target;
  return sidesOf(t).every((side) => entry.sets.filter((s) => s.side === side && s.value >= t.max).length >= t.sets);
}

function entryMissed(entry) {
  const t = entry.target;
  return sidesOf(t).some((side) => {
    const sets = entry.sets.filter((s) => s.side === side);
    return sets.length < t.sets || sets.some((s) => s.value < t.min);
  });
}

function entryRirs(entry) {
  return entry.sets.map((s) => s.rir).filter(isNum);
}

function hasPainNote(log) {
  return typeof log.pain === 'string' && log.pain.trim() !== '';
}

function readiness(ctx, p, entries) {
  const last2 = entries.filter((e) => e.full).slice(-2);
  if (last2.length < 2) return null;
  const rirAvgs = [];
  let usedRpe = false;
  for (const { log, entry } of last2) {
    if (entry.pain || hasPainNote(log) || !entryClean(entry)) return null;
    const rirs = entryRirs(entry);
    if (rirs.length) {
      const a = avg(rirs);
      if (a < 2) return null;
      rirAvgs.push(a);
    } else {
      if (!isNum(log.rpe) || log.rpe > 7) return null;
      usedRpe = true;
    }
  }
  if (p.legHeavy && ctx.recovery.legBlock) return null;
  if (ctx.recovery.lowRecovery) return null;
  return { last2, rirAvgs, usedRpe, allRir3: rirAvgs.length === 2 && rirAvgs.every((a) => a >= 3) };
}

function loggedSessionMinutes(state, sessionId) {
  const mins = state.strengthLogs.filter((l) => l.sessionId === sessionId && isNum(l.durationMin))
    .sort(byDate).slice(-2).map((l) => l.durationMin);
  return mins.length ? avg(mins) : 0;
}

function leverStep(ctx, sessionId, session, p) {
  const ex = EXERCISES[p.exerciseId];
  for (const lever of ex.levers) {
    if (lever === 'tempo' && p.unit === 'reps' && (p.tempoDown || 0) < 5) {
      const n = (p.tempoDown || 0) + 1;
      return { to: { ...p, tempoDown: n }, change: `slow the lowering to ${n} s` };
    }
    if (lever === 'pause' && p.unit === 'reps' && (p.pause || 0) < 3) {
      const n = (p.pause || 0) + 1;
      return { to: { ...p, pause: n }, change: `pause ${n} s` };
    }
    if (lever === 'variation') {
      const i = ladderIndex(p);
      const nxt = i >= 0 ? ex.ladder[i + 1] : null;
      if (nxt) {
        return {
          to: { ...p, variation: nxt.name, min: nxt.min, max: nxt.max, sides: nxt.sides || ex.sides },
          change: `move to ${nxt.name}`,
        };
      }
    }
    if (lever === 'sets' && p.sets < (p.maxSets || 3)) {
      const bigger = { ...session, exercises: session.exercises.map((x) => (x.exerciseId === p.exerciseId ? { ...x, sets: x.sets + 1 } : x)) };
      if (estimateMinutes(bigger) <= MAX_MINUTES && loggedSessionMinutes(ctx.state, sessionId) <= MAX_MINUTES) {
        return { to: { ...p, sets: p.sets + 1 }, change: 'add a set' };
      }
    }
  }
  return null;
}

function progressStep(ctx, sessionId, session, p, ready) {
  const { phase } = ctx.block;
  const ex = EXERCISES[p.exerciseId];
  const repsStep = (allowTwo) => {
    if (p.unit === 'seconds') {
      if (p.max + 5 > ex.cap) return null;
      return { to: { ...p, min: p.min + 5, max: p.max + 5 }, change: 'hold 5 s longer' };
    }
    const d = allowTwo && ready.allRir3 ? 2 : 1;
    if (p.max + d > ex.cap) return null;
    return { to: { ...p, min: p.min + d, max: p.max + d }, change: d === 2 ? 'add 2 reps' : 'add a rep' };
  };
  if (phase === 'build') return repsStep(true) || leverStep(ctx, sessionId, session, p);
  if (phase === 'intensify') return leverStep(ctx, sessionId, session, p);
  if (phase === 'consolidate') return p.unit === 'seconds' ? null : repsStep(false);
  return null;
}

function rxText(p) {
  const t = tempoLabel(p);
  return t ? `${prescriptionLabel(p)} (${t})` : prescriptionLabel(p);
}

function suggestion(rule, kind, sessionId, p, to, title, reason, evidence) {
  return {
    key: `${rule}:${sessionId}:${rule === 'run-affected' || rule === 'effort' ? '' : p.exerciseId}:${evidence.join(',')}`,
    rule, kind, priority: PRIORITY[rule], sessionId, exerciseId: p.exerciseId, exerciseName: exName(p),
    from: p, to, title, reason, evidence,
  };
}

function exerciseCandidates(ctx, sessionId, session, p) {
  const out = [];
  const entries = matchingEntries(ctx.state, sessionId, p);
  const ex = EXERCISES[p.exerciseId];
  const name = exName(p);

  // Pain flagged on this exercise in its most recent log.
  const latest = entries[entries.length - 1];
  if (latest && latest.entry.pain) {
    const i = ladderIndex(p);
    let to = null;
    let change = '';
    if (i > 0) {
      const easier = ex.ladder[i - 1];
      to = { ...p, variation: easier.name, min: easier.min, max: easier.max, sides: easier.sides || ex.sides };
      change = `switch to ${easier.name}`;
    } else if (p.sets > 1) {
      to = { ...p, sets: p.sets - 1 };
      change = 'drop one set';
    }
    if (to) {
      out.push(suggestion('pain', 'reduce', sessionId, p, to, `${name}: ${change}`,
        `You flagged pain on ${name} on ${formatShort(latest.log.date)}. Ease off: ${change} (${rxText(to)}). ${SAFETY_NOTE}`,
        [latest.log.id]));
    }
  }

  // Reps below the bottom of the range (or sets not finished) in 2 of the last 3 logs.
  const last3 = entries.slice(-3);
  const missed = last3.filter((e) => entryMissed(e.entry));
  if (missed.length >= 2) {
    const step = p.unit === 'seconds' ? 5 : 2;
    const min = Math.max(1, p.min - step);
    const max = Math.max(min, p.max - step);
    if (min !== p.min || max !== p.max) {
      const to = { ...p, min, max };
      out.push(suggestion('missed', 'reduce', sessionId, p, to, `${name}: lower the target`,
        `You fell short of ${p.min}${p.unit === 'seconds' ? ' s' : ''} on ${name} in ${missed.length} of your last ${last3.length} Session ${sessionId} workouts (${dateList(missed.map((e) => e.log))}). Lower the target to ${rxText(to)} so every set stays clean.`,
        missed.map((e) => e.log.id)));
    }
  }

  // Ready to progress.
  const ready = readiness(ctx, p, entries);
  if (ready) {
    const step = progressStep(ctx, sessionId, session, p, ready);
    if (step) {
      const top = `${p.sets} × ${p.max}${p.unit === 'seconds' ? ' s' : ''}${sideText(p)}`;
      const effort = ready.usedRpe ? 'at a session effort of 7/10 or less' : 'with 2 or more reps in reserve';
      const changeText = step.change.charAt(0).toUpperCase() + step.change.slice(1);
      out.push(suggestion('progress', 'progress', sessionId, p, step.to, `${name}: ${step.change}`,
        `On ${name} you hit ${top}, every set, ${effort} in your last two Session ${sessionId} workouts (${dateList(ready.last2.map((e) => e.log))}). ${changeText}: ${rxText(step.to)}.`,
        ready.last2.map((e) => e.log.id)));
    }
  }
  return out;
}

function sessionCandidates(ctx, sessionId, session) {
  const out = [];
  const { state } = ctx;
  const logs = state.strengthLogs.filter((l) => l.sessionId === sessionId).sort(byDate);

  // Effort 9 or more in the last two logs of this session: one set fewer on the biggest exercise.
  const last2 = logs.slice(-2);
  if (last2.length === 2 && last2.every((l) => isNum(l.rpe) && l.rpe >= 9)) {
    const target = [...session.exercises].filter((p) => p.sets > 2).sort((a, b) => b.sets - a.sets)[0];
    if (target) {
      const to = { ...target, sets: target.sets - 1 };
      out.push(suggestion('effort', 'reduce', sessionId, target, to, `${exName(target)}: drop one set`,
        `Your last two Session ${sessionId} workouts (${dateList(last2)}) were rated ${last2[0].rpe}/10 and ${last2[1].rpe}/10. Take one set off ${exName(target)} (${rxText(to)}) so the session stays challenging but repeatable.`,
        last2.map((l) => l.id)));
    }
  }

  // A run where sore legs affected it: lighten the leg work in the strength session just before it.
  const runs = [...ctx.recovery.affectedRuns].sort(byDate).reverse();
  for (const run of runs) {
    const before = state.strengthLogs
      .filter((l) => l.date <= run.date && daysBetween(l.date, run.date) <= 3)
      .sort(byDate).pop();
    if (!before || before.sessionId !== sessionId) continue;
    const target = session.exercises.filter((p) => p.legHeavy && p.sets > 2).sort((a, b) => b.sets - a.sets)[0];
    if (!target) continue;
    const to = { ...target, sets: target.sets - 1 };
    out.push(suggestion('run-affected', 'reduce', sessionId, target, to, `${exName(target)}: drop one set`,
      `You said sore legs affected your ${RUN_TYPE_LABEL[run.runType] ? RUN_TYPE_LABEL[run.runType].toLowerCase() + ' ' : ''}run on ${formatShort(run.date)}, after Session ${sessionId} on ${formatShort(before.date)}. Take one set off ${exName(target)} (${rxText(to)}) so strength supports your running.`,
      [run.id, before.id]));
    break;
  }
  return out;
}

function notesFor(ctx) {
  const { state, today, plan, block, recovery } = ctx;
  const notes = [];

  if (block.phase === 'review') {
    notes.push({ key: `block-review:${block.number}`, kind: 'block', level: 'info', action: 'start-block',
      title: `Block ${block.number} finished`, text: block.text });
  }

  const latestBench = [...state.benchmarks].sort(byDate).pop();
  if (latestBench) {
    const days = daysBetween(latestBench.date, today);
    if (days >= 28) {
      const overdue = days >= 56;
      notes.push({ key: `benchmark:${latestBench.id}:${overdue ? 'overdue' : 'due'}`, kind: 'benchmark',
        level: overdue ? 'warn' : 'info', action: 'benchmark',
        title: overdue ? 'Benchmark tests overdue' : 'Benchmark tests due',
        text: `Your last tests were on ${formatShort(latestBench.date)}. Repeat them under similar conditions: press-ups, plank, single-leg bridge, and a 10K or similar effort only when it suits your running.` });
    }
  }

  if (recovery.lowRecovery) {
    const last = recovery.recent[recovery.recent.length - 1];
    notes.push({ key: `low-recovery:${last.id}`, kind: 'recovery', level: 'warn', title: 'Recovery looks low',
      text: `Your recent check-ins average energy ${recovery.energy?.toFixed(1) ?? '–'}/5 and sleep ${recovery.sleep?.toFixed(1) ?? '–'}/5. The coach is holding all increases. Look at sleep, stress and illness before adding work.` });
  }

  if (recovery.legBlock) {
    const why = recovery.affectedRuns.length
      ? `sore legs affected your run on ${formatShort([...recovery.affectedRuns].sort(byDate).pop().date)}`
      : `you reported leg soreness of ${recovery.soreChecks[recovery.soreChecks.length - 1].legSoreness}/5`;
    const ids = [...recovery.affectedRuns, ...recovery.soreChecks].map((x) => x.id).join(',');
    notes.push({ key: `leg-hold:${ids}`, kind: 'recovery', level: 'info', title: 'Leg increases paused',
      text: `Because ${why}, leg exercises will not progress for now. Upper-body and core work can still move on.` });
  }

  // Holding steady: two full sessions with every set at 0 reps in reserve.
  for (const sessionId of ['A', 'B']) {
    for (const p of plan.sessions[sessionId].exercises) {
      const full = matchingEntries(state, sessionId, p).filter((e) => e.full).slice(-2);
      if (full.length === 2 && full.every((e) => {
        const rirs = entryRirs(e.entry);
        return rirs.length && rirs.every((r) => r === 0);
      })) {
        notes.push({ key: `hold:${sessionId}:${p.exerciseId}:${full.map((e) => e.log.id).join(',')}`, kind: 'hold',
          level: 'info', title: `Hold ${exName(p)}`,
          text: `Your last two Session ${sessionId} workouts had 0 reps in reserve on ${exName(p)}. Keep the same target until it feels manageable; no grinding.` });
      }
    }
  }

  // Runs feeling harder at the same pace.
  const byType = {};
  for (const r of state.runLogs) (byType[r.runType] = byType[r.runType] || []).push(r);
  for (const [type, runs] of Object.entries(byType)) {
    const withData = runs.filter((r) => isNum(r.rpe) && paceSecPerKm(r.distanceKm, r.durationSec)).sort(byDate);
    if (withData.length < 5) continue;
    const last2 = withData.slice(-2);
    const prev3 = withData.slice(-5, -2);
    if (!within(last2[1].date, today, 14)) continue;
    const paceA = avg(prev3.map((r) => paceSecPerKm(r.distanceKm, r.durationSec)));
    const paceB = avg(last2.map((r) => paceSecPerKm(r.distanceKm, r.durationSec)));
    const rpeA = avg(prev3.map((r) => r.rpe));
    const rpeB = avg(last2.map((r) => r.rpe));
    if (Math.abs(paceB - paceA) / paceA <= 0.03 && rpeB - rpeA >= 1.5) {
      notes.push({ key: `run-effort:${type}:${last2[1].id}`, kind: 'running', level: 'warn',
        title: `${RUN_TYPE_LABEL[type] || 'Your'} runs feel harder`,
        text: `Effort went from ${rpeA.toFixed(1)} to ${rpeB.toFixed(1)}/10 at about the same pace (${formatPace(paceB)}). Before adding anything, check sleep, stress, illness and your recent training load.` });
    }
  }

  // Weekly run volume jump.
  const thisWeek = weekStart(today);
  const kmIn = (start) => state.runLogs.filter((r) => r.date >= start && r.date <= addDays(start, 6))
    .reduce((s, r) => s + (Number(r.distanceKm) || 0), 0);
  const prev = [1, 2, 3].map((i) => kmIn(addDays(thisWeek, -7 * i)));
  const prevAvg = avg(prev);
  const nowKm = kmIn(thisWeek);
  if (prev.filter((k) => k > 0).length >= 2 && prevAvg > 0 && nowKm > prevAvg * 1.3) {
    notes.push({ key: `km-jump:${thisWeek}`, kind: 'running', level: 'info', title: 'Big jump in running',
      text: `This week's running (${nowKm.toFixed(1)} km) is more than 30 % above your recent average (${prevAvg.toFixed(1)} km). More volume is not automatically better; watch how your legs recover.` });
  }

  const sig = JSON.stringify(state.schedule);
  scheduleWarnings(state.schedule).filter((w) => w.level === 'warn').forEach((w, i) => {
    notes.push({ key: `schedule:${sig}:${i}`, kind: 'schedule', level: 'warn', title: 'Schedule check', text: w.text });
  });

  return notes;
}

export function coachReview(state, today) {
  if (!state.setupDone || !state.plans.length) return { suggestions: [], notes: [], block: blockInfo(state, today) };
  const plan = currentPlan(state);
  const ctx = { state, today, plan, block: blockInfo(state, today), recovery: recoveryFlags(state, today) };
  const decided = new Set(state.decisions.map((d) => d.key));
  const suggestions = [];
  for (const sessionId of ['A', 'B']) {
    const session = plan.sessions[sessionId];
    const cands = [
      ...session.exercises.flatMap((p) => exerciseCandidates(ctx, sessionId, session, p)),
      ...sessionCandidates(ctx, sessionId, session),
    ].filter((c) => !decided.has(c.key));
    cands.sort((a, b) => a.priority - b.priority
      || session.exercises.findIndex((p) => p.exerciseId === a.exerciseId) - session.exercises.findIndex((p) => p.exerciseId === b.exerciseId));
    const recentProgress = state.decisions.filter((d) => d.sessionId === sessionId && d.kind === 'progress'
      && (d.status === 'accepted' || d.status === 'edited') && within(d.at, today, 7)).length;
    let progressRoom = Math.max(0, 2 - recentProgress);
    const used = new Set();
    let count = 0;
    for (const c of cands) {
      if (count >= 2) break;
      if (used.has(c.exerciseId)) continue;
      if (c.kind === 'progress') {
        if (progressRoom <= 0) continue;
        progressRoom -= 1;
      }
      used.add(c.exerciseId);
      suggestions.push(c);
      count += 1;
    }
  }
  const notes = notesFor(ctx).filter((n) => !decided.has(n.key));
  return { suggestions, notes, block: ctx.block };
}

function decision(s, status, today, planVersion = null) {
  return { key: s.key, status, at: today, planVersion, sessionId: s.sessionId || null, exerciseId: s.exerciseId || null, kind: s.kind };
}

export function acceptSuggestion(state, s, today, editedTo = null) {
  const plan = currentPlan(state);
  const to = editedTo || s.to;
  const reason = editedTo ? `${s.title} (edited by you)` : s.title;
  const next = { ...withPrescription(plan, s.sessionId, s.exerciseId, to, { today, reason }), detail: s.reason };
  return {
    ...state,
    plans: [...state.plans, next],
    decisions: [...state.decisions, decision(s, editedTo ? 'edited' : 'accepted', today, next.version)],
  };
}

export function rejectSuggestion(state, s, today) {
  return { ...state, decisions: [...state.decisions, decision(s, 'rejected', today)] };
}

export function dismissNote(state, note, today) {
  return { ...state, decisions: [...state.decisions, { key: note.key, status: 'dismissed', at: today, kind: note.kind }] };
}

export function startNextBlock(state, today) {
  return { ...state, block: { number: (state.block.number || 1) + 1, startDate: weekStart(today) } };
}
