// The coach: fixed, explainable rules over the logs. It never changes the plan itself; it returns
// suggestions (each with a reason and the logs behind it) and notes. Accepting one makes a new plan version.
import { exerciseById, useExercises, SAFETY_NOTE } from './library.js';
import {
  currentPlan, estimateMinutes, ladderIndex, prescriptionLabel, sessionIds, sideText, targetMinutes, tempoLabel, withPrescription,
} from './plan.js';
import { blockInfo, scheduleWarnings } from './schedule.js';
import { daysBetween, formatShort, weekStart } from './dates.js';

const PRIORITY = { pain: 1, effort: 3, missed: 4, progress: 5 };

const within = (date, today, days) => {
  const d = daysBetween(date, today);
  return d >= 0 && d < days;
};
const byDate = (a, b) => (a.date === b.date ? String(a.createdAt || a.id).localeCompare(String(b.createdAt || b.id)) : a.date < b.date ? -1 : 1);
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const sidesOf = (t) => (t.sides && t.sides.length ? t.sides : [null]);
const exName = (p) => p.variation || exerciseById(p.exerciseId).name;
const dateList = (logs) => logs.map((l) => formatShort(l.date)).join(' and ');

export function recoveryFlags(state, today) {
  const recent = state.checkins.filter((c) => within(c.date, today, 7)).sort(byDate).slice(-3);
  const energy = avg(recent.map((c) => c.energy).filter(isNum));
  const sleep = avg(recent.map((c) => c.sleep).filter(isNum));
  const lowRecovery = recent.length > 0 && ((energy !== null && energy <= 2) || (sleep !== null && sleep <= 2));
  const soreChecks = state.checkins.filter((c) => within(c.date, today, 7) && isNum(c.legSoreness) && c.legSoreness >= 4);
  return {
    recent, energy, sleep, lowRecovery, soreChecks,
    legBlock: soreChecks.length > 0,
  };
}

function targetMatches(t, p) {
  return t && t.variation === p.variation && t.min === p.min && t.max === p.max && t.unit === p.unit
    && (t.tempoDown || 0) === (p.tempoDown || 0) && (t.pause || 0) === (p.pause || 0)
    && JSON.stringify(t.sides || null) === JSON.stringify(p.sides || null);
}

// Logs of this session that trained this exact prescription (only logs with all its sets count as full).
function matchingEntries(state, sessionId, p) {
  const out = [];
  for (const log of state.strengthLogs) {
    if (log.sessionId !== sessionId || log.date < p.since || log.easy) continue;
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

// Pain counts whatever happened to the exercise: flagged, or skipped with the reason "Pain".
function painFlag(entry) {
  return Boolean(entry.pain) || (entry.status === 'skipped' && entry.reason === 'Pain');
}

// Every log of this exercise in this session since its prescription began, done, swapped or skipped.
function anyEntries(state, sessionId, p) {
  const out = [];
  for (const log of state.strengthLogs) {
    if (log.sessionId !== sessionId || log.date < p.since) continue;
    const entry = (log.exercises || []).find((e) => e.exerciseId === p.exerciseId);
    if (entry) out.push({ log, entry });
  }
  return out.sort((a, b) => byDate(a.log, b.log));
}

const EVIDENCE_MAX_AGE_DAYS = 14;

function readiness(ctx, p, entries, any) {
  const last2 = entries.filter((e) => e.full).slice(-2);
  if (last2.length < 2) return null;
  // Evidence must be recent: no increase from old logs after a break.
  if (daysBetween(last2[1].log.date, ctx.today) > EVIDENCE_MAX_AGE_DAYS) return null;
  // Any pain on this exercise since the first evidence log (even swapped or skipped) blocks progress.
  const from = last2[0].log.date;
  if (any.some(({ log, entry }) => log.date >= from && (painFlag(entry) || hasPainNote(log)))) return null;
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
  const ex = exerciseById(p.exerciseId);
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
      const limit = targetMinutes(session);
      if (estimateMinutes(bigger) <= limit && loggedSessionMinutes(ctx.state, sessionId) <= limit) {
        return { to: { ...p, sets: p.sets + 1 }, change: 'add a set' };
      }
    }
  }
  return null;
}

function progressStep(ctx, sessionId, session, p, ready) {
  const { phase } = ctx.block;
  const ex = exerciseById(p.exerciseId);
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

// The numbers behind a suggestion, one line per log, so a mistyped set is visible before Accept.
function valuesText(entry) {
  if (entry.status === 'skipped') return `skipped${entry.reason ? ` (${entry.reason.toLowerCase()})` : ''}`;
  const unit = entry.target && entry.target.unit === 'seconds' ? ' s' : '';
  const sides = [...new Set(entry.sets.map((x) => x.side))];
  const text = sides.map((side) => {
    const vals = entry.sets.filter((x) => x.side === side).map((x) => x.value).join(' ');
    return side ? `${side} ${vals}` : vals;
  }).join(' · ');
  const rirs = entryRirs(entry);
  return `${text}${unit}${rirs.length ? ` (RIR ${Math.min(...rirs)}${Math.max(...rirs) !== Math.min(...rirs) ? `–${Math.max(...rirs)}` : ''})` : ''}${entry.pain ? ', pain' : ''}`;
}

function entryLines(items) {
  return items.map(({ log, entry }) => `${formatShort(log.date)}: ${valuesText(entry)}`);
}

function suggestion(rule, kind, sessionId, p, to, title, reason, evidence, details = []) {
  return {
    key: `${rule}:${sessionId}:${rule === 'effort' ? '' : p.exerciseId}:${evidence.join(',')}`,
    rule, kind, priority: PRIORITY[rule], sessionId, exerciseId: p.exerciseId, exerciseName: exName(p),
    from: p, to, title, reason, evidence, details,
  };
}

function exerciseCandidates(ctx, sessionId, session, p) {
  const out = [];
  const entries = matchingEntries(ctx.state, sessionId, p);
  const any = anyEntries(ctx.state, sessionId, p);
  const ex = exerciseById(p.exerciseId);
  const name = exName(p);

  // Pain on this exercise in its most recent log, whether it was done, swapped or skipped.
  const latest = any[any.length - 1];
  if (latest && painFlag(latest.entry)) {
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
        `You ${latest.entry.pain ? 'flagged pain on' : 'skipped'} ${name}${latest.entry.pain ? '' : ' because of pain'} on ${formatShort(latest.log.date)}. Ease off: ${change} (${rxText(to)}). ${SAFETY_NOTE}`,
        [latest.log.id], entryLines([latest])));
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
        missed.map((e) => e.log.id), entryLines(last3)));
    }
  }

  // Ready to progress.
  const ready = readiness(ctx, p, entries, any);
  if (ready) {
    const step = progressStep(ctx, sessionId, session, p, ready);
    if (step) {
      const top = `${p.sets} × ${p.max}${p.unit === 'seconds' ? ' s' : ''}${sideText(p)}`;
      const effort = ready.usedRpe ? 'at a session effort of 7/10 or less' : 'with 2 or more reps in reserve';
      const changeText = step.change.charAt(0).toUpperCase() + step.change.slice(1);
      out.push(suggestion('progress', 'progress', sessionId, p, step.to, `${name}: ${step.change}`,
        `On ${name} you hit ${top}, every set, ${effort} in your last two Session ${sessionId} workouts (${dateList(ready.last2.map((e) => e.log))}). ${changeText}: ${rxText(step.to)}.`,
        ready.last2.map((e) => e.log.id), entryLines(ready.last2)));
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
        last2.map((l) => l.id), last2.map((l) => `${formatShort(l.date)}: effort ${l.rpe}/10${l.durationMin ? `, ${l.durationMin} min` : ''}`)));
    }
  }

  return out;
}

// Signs you need an easy week: effort climbing while reps fall short, or check-ins low for two weeks.
// Not in the settling-in weeks or the review, not during an easy week, and not within 14 days of the last
// easy-week offer you answered (or 28 days of the last easy week).
const EASY_SESSIONS = 2;

export function easyWeekActive(state) {
  return Boolean(state.easyWeek && state.easyWeek.sessionsLeft > 0);
}

function fatigue(ctx) {
  const { state, today, block } = ctx;
  if (block.phase === 'establish' || block.phase === 'review' || easyWeekActive(state)) return null;
  const answered = state.decisions.filter((d) => d.kind === 'easy');
  if (answered.some((d) => within(d.at, today, d.status === 'accepted' ? 28 : 14))) return null;
  const why = [];
  const logs = state.strengthLogs.filter((l) => within(l.date, today, 21) && !l.easy).sort(byDate);
  const rpes = logs.map((l) => l.rpe).filter(isNum);
  if (rpes.length >= 5) {
    const last = avg(rpes.slice(-3));
    const before = avg(rpes.slice(-6, -3));
    const short = logs.slice(-3).filter((l) => (l.exercises || []).some((e) => e.status === 'done' && e.target && entryMissed(e))).length;
    if (last >= 8 && last - before >= 1 && short >= 2) {
      why.push(`Your last three sessions averaged effort ${last.toFixed(1)}/10, up from ${before.toFixed(1)}, and you fell short of your targets in ${short} of them.`);
    }
  }
  const checks = state.checkins.filter((c) => within(c.date, today, 14) && ((isNum(c.energy) && c.energy <= 2) || (isNum(c.sleep) && c.sleep <= 2)));
  if (checks.length >= 4) why.push(`${checks.length} check-ins in the last two weeks showed low energy or poor sleep.`);
  return why.length ? why.join(' ') : null;
}

// An exercise with nowhere further to go: ready to step up, but at its cap with every lever used.
function maxedOut(ctx) {
  const { plan, block } = ctx;
  if (block.phase !== 'build' && block.phase !== 'intensify') return [];
  const out = [];
  for (const sessionId of sessionIds(plan)) {
    const session = plan.sessions[sessionId];
    for (const p of session.exercises) {
      const entries = matchingEntries(ctx.state, sessionId, p);
      const ready = readiness(ctx, p, entries, anyEntries(ctx.state, sessionId, p));
      if (ready && !progressStep(ctx, sessionId, session, p, ready)) out.push({ sessionId, name: exName(p) });
    }
  }
  return out;
}

export const REST_FLOOR = { short: 30, long: 60 };

function notesFor(ctx) {
  const { state, today, plan, block, recovery } = ctx;
  const notes = [];

  if (easyWeekActive(state)) {
    const n = state.easyWeek.sessionsLeft;
    notes.push({ key: `easy-on:${state.easyWeek.from}:${n}`, kind: 'easy-on', level: 'info', title: 'Easy week',
      text: `${n} lighter session${n > 1 ? 's' : ''} to go, with one set fewer on every exercise. Step-ups wait until it is done, then the plan picks up where it left off.` });
  } else {
    const tired = fatigue(ctx);
    if (tired) {
      notes.push({ key: `easy:${weekStart(today)}`, kind: 'easy', level: 'warn', action: 'easy-week', title: 'Time for an easy week?',
        text: `${tired} An easy week, with one set fewer on every exercise for your next ${EASY_SESSIONS} sessions, lets your body catch up. Then the plan picks up where it left off.` });
    }
  }

  const rest = { short: state.settings.restShort || 45, long: state.settings.restLong || 75 };
  if (rest.short > REST_FLOOR.short || rest.long > REST_FLOOR.long) {
    const maxed = maxedOut(ctx);
    if (maxed.length) {
      const to = { short: Math.max(REST_FLOOR.short, rest.short - 15), long: Math.max(REST_FLOOR.long, rest.long - 15) };
      const names = maxed.map((m) => `${m.name} (Session ${m.sessionId})`);
      const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
      const parts = [];
      if (to.short !== rest.short) parts.push(`${rest.short} → ${to.short} s between exercises`);
      if (to.long !== rest.long) parts.push(`${rest.long} → ${to.long} s between rounds`);
      notes.push({ key: `rest:${block.number}:${rest.short}:${rest.long}`, kind: 'rest', level: 'info', action: 'shorter-rest', rest: to,
        title: 'Shorter rests?',
        text: `${list} ${maxed.length > 1 ? 'have' : 'has'} nowhere further to go right now. Shorter rests make the whole circuit harder without making it longer: ${parts.join(', ')}.` });
    }
  }

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
        text: `Your last tests were on ${formatShort(latestBench.date)}. Repeat them under similar conditions: press-ups, plank, single-leg bridges, squats and lunges.` });
    }
  }

  if (recovery.lowRecovery) {
    const last = recovery.recent[recovery.recent.length - 1];
    notes.push({ key: `low-recovery:${last.id}`, kind: 'recovery', level: 'warn', title: 'Recovery looks low',
      text: `Your recent check-ins average energy ${recovery.energy?.toFixed(1) ?? '–'}/5 and sleep ${recovery.sleep?.toFixed(1) ?? '–'}/5. The coach is holding all increases. Look at sleep, stress and illness before adding work.` });
  }

  if (recovery.legBlock) {
    const why = `you reported leg soreness of ${recovery.soreChecks[recovery.soreChecks.length - 1].legSoreness}/5`;
    const ids = recovery.soreChecks.map((x) => x.id).join(',');
    notes.push({ key: `leg-hold:${ids}`, kind: 'recovery', level: 'info', title: 'Leg increases paused',
      text: `Because ${why}, leg exercises will not progress for now. Upper-body and core work can still move on.` });
  }

  // Holding steady: two full sessions with every set at 0 reps in reserve.
  for (const sessionId of sessionIds(plan)) {
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

  const sig = JSON.stringify(state.schedule);
  scheduleWarnings(state.schedule).forEach((w, i) => {
    notes.push({ key: `schedule:${sig}:${i}`, kind: 'schedule', level: w.level, title: 'Schedule check', text: w.text });
  });

  return notes;
}

export function coachReview(state, today) {
  useExercises(state);
  if (!state.setupDone || !state.plans.length) return { suggestions: [], notes: [], block: blockInfo(state, today) };
  const plan = currentPlan(state);
  const ctx = { state, today, plan, block: blockInfo(state, today), recovery: recoveryFlags(state, today) };
  const decided = new Set(state.decisions.map((d) => d.key));
  const suggestions = [];
  for (const sessionId of sessionIds(plan)) {
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
  const kept = easyWeekActive(state) ? suggestions.filter((x) => x.kind !== 'progress') : suggestions;
  return { suggestions: kept, notes, block: ctx.block };
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

// Undo a decision: only while its plan version is still the latest (otherwise use Plan history).
export function canUndoDecision(state, key) {
  const d = state.decisions.find((x) => x.key === key);
  if (!d) return false;
  return !d.planVersion || state.plans[state.plans.length - 1].version === d.planVersion;
}

export function undoDecision(state, key) {
  if (!canUndoDecision(state, key)) return state;
  const d = state.decisions.find((x) => x.key === key);
  const plans = d.planVersion ? state.plans.slice(0, -1) : state.plans;
  return { ...state, plans, decisions: state.decisions.filter((x) => x !== d) };
}

export function rejectSuggestion(state, s, today) {
  return { ...state, decisions: [...state.decisions, decision(s, 'rejected', today)] };
}

export function startEasyWeek(state, note, today) {
  return {
    ...state,
    easyWeek: { from: today, sessionsLeft: EASY_SESSIONS },
    decisions: [...state.decisions, { key: note.key, status: 'accepted', at: today, kind: 'easy' }],
  };
}

// After a session is saved: one fewer easy session to go.
export function afterSessionSaved(state, log) {
  if (!log.easy || !state.easyWeek) return state;
  const left = state.easyWeek.sessionsLeft - 1;
  return { ...state, easyWeek: left > 0 ? { ...state.easyWeek, sessionsLeft: left } : null };
}

export function shortenRests(state, note, today) {
  return {
    ...state,
    settings: { ...state.settings, restShort: note.rest.short, restLong: note.rest.long },
    decisions: [...state.decisions, {
      key: note.key, status: 'accepted', at: today, kind: 'rest',
      before: { restShort: state.settings.restShort, restLong: state.settings.restLong },
    }],
  };
}

export function dismissNote(state, note, today) {
  return { ...state, decisions: [...state.decisions, { key: note.key, status: 'dismissed', at: today, kind: note.kind }] };
}

export function startNextBlock(state, today) {
  return { ...state, block: { number: (state.block.number || 1) + 1, startDate: weekStart(today) } };
}

// Where each exercise stands: one plain line per exercise, so progress is visible between suggestions.
// tone: 'good' (on its way or ready), 'warn' (on hold), 'neutral'.
export function exerciseStanding(state, today) {
  useExercises(state);
  if (!state.setupDone || !state.plans.length) return [];
  const plan = currentPlan(state);
  const block = blockInfo(state, today);
  const recovery = recoveryFlags(state, today);
  const review = coachReview(state, today);
  const out = [];
  for (const sessionId of sessionIds(plan)) {
    for (const p of plan.sessions[sessionId].exercises) {
      const name = exName(p);
      const unit = p.unit === 'seconds' ? ' s' : '';
      const row = (tone, text) => out.push({ sessionId, exerciseId: p.exerciseId, name, target: rxText(p), tone, text });
      const sug = review.suggestions.find((x) => x.sessionId === sessionId && x.exerciseId === p.exerciseId);
      if (sug) { row(sug.kind === 'progress' ? 'good' : 'warn', `Suggestion waiting: ${sug.title.replace(`${name}: `, '')}`); continue; }
      const any = anyEntries(state, sessionId, p);
      const latest = any[any.length - 1];
      if (latest && (painFlag(latest.entry) || hasPainNote(latest.log))) { row('warn', `On hold: pain noted on ${formatShort(latest.log.date)}`); continue; }
      if (p.legHeavy && recovery.legBlock) { row('warn', 'On hold: leg soreness of 4 or more this week'); continue; }
      if (recovery.lowRecovery) { row('warn', 'On hold: low energy or sleep in recent check-ins'); continue; }
      const full = matchingEntries(state, sessionId, p).filter((e) => e.full);
      if (!full.length) { row('neutral', `New target since ${formatShort(p.since)}: two clean sessions at ${p.max}${unit} step it up`); continue; }
      if (daysBetween(full[full.length - 1].log.date, today) > EVIDENCE_MAX_AGE_DAYS) {
        row('neutral', `Needs a fresh session (last one ${formatShort(full[full.length - 1].log.date)})`);
        continue;
      }
      const qualifies = ({ log, entry }) => {
        if (!entryClean(entry) || entry.pain || hasPainNote(log)) return false;
        const rirs = entryRirs(entry);
        return rirs.length ? avg(rirs) >= 2 : isNum(log.rpe) && log.rpe <= 7;
      };
      const last2 = full.slice(-2);
      let n = 0;
      for (let i = last2.length - 1; i >= 0 && qualifies(last2[i]); i--) n += 1;
      if (n >= 2) {
        if (block.phase === 'establish') row('good', 'Ready: increases start in week 3');
        else if (block.phase === 'review') row('good', 'Ready: plan it in the block review');
        else row('good', 'Ready, waiting its turn: one change at a time');
        continue;
      }
      if (n === 1) { row('good', `1 of 2: one more clean session at ${p.max}${unit} on every set steps it up`); continue; }
      const last = last2[last2.length - 1];
      if (entryMissed(last.entry)) row('neutral', `Below target last time: aim for at least ${p.min}${unit} on every set`);
      else if (entryClean(last.entry)) row('neutral', `Hit ${p.max}${unit} on every set, but with under 2 reps in reserve: once it feels easier`);
      else row('neutral', `0 of 2: reach ${p.max}${unit} on every set with 2 or more reps in reserve`);
    }
  }
  return out;
}
