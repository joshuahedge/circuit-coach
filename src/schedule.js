// Weekly scheduling: where strength sessions go around the runs, the block week, and the week view model.
import { DAY_KEYS, DAY_NAMES, addDays, dayKey, daysBetween, weekDays, weekStart } from './dates.js';

export const RUN_TYPES = ['easy', 'intervals', 'tempo', 'long', 'other'];
export const RUN_TYPE_LABEL = {
  easy: 'Easy', intervals: 'Intervals', tempo: 'Tempo', long: 'Long', other: 'Other', quality: 'Quality',
};
export const SCHEDULE_RUN_LABEL = { easy: 'Easy run', quality: 'Quality run', long: 'Long run', other: 'Run' };

// Logged run types map onto the schedule's easy / quality / long.
export function runCategory(runType) {
  if (runType === 'tempo' || runType === 'intervals' || runType === 'quality') return 'quality';
  if (runType === 'long' || runType === 'easy') return runType;
  return 'other';
}

const next = (key, n = 1) => DAY_KEYS[(DAY_KEYS.indexOf(key) + n) % 7];

function dayScore(key, runDays) {
  let score = 0;
  const notes = [];
  const n1 = runDays[next(key)];
  const n2 = runDays[next(key, 2)];
  if (n1 === 'long') { score -= 10; notes.push(`the day before ${DAY_NAMES[next(key)]}'s long run`); }
  if (n1 === 'quality') { score -= 3; notes.push(`the day before ${DAY_NAMES[next(key)]}'s quality run, so legs stay moderate`); }
  if (n2 === 'long') { score -= 2; notes.push(`two days before ${DAY_NAMES[next(key, 2)]}'s long run, so the lighter leg version applies`); }
  const prev = runDays[next(key, 6)];
  if (prev === 'long') { score -= 2; notes.push(`the day after ${DAY_NAMES[next(key, 6)]}'s long run`); }
  if (key === 'fri') { score -= 4; notes.push('Friday is better kept for recovery'); }
  if (key === 'sun') { score -= 4; notes.push('Sunday is kept for rest, walking or mobility'); }
  return { score, notes };
}

function consecutive(a, b) {
  const i = DAY_KEYS.indexOf(a);
  const j = DAY_KEYS.indexOf(b);
  return Math.abs(i - j) === 1 || (Math.min(i, j) === 0 && Math.max(i, j) === 6);
}

export function recommendStrengthDays(runDays) {
  const runKeys = Object.keys(runDays);
  let candidates = DAY_KEYS.filter((d) => !runKeys.includes(d));
  // Six or seven run days leave no free pair: strength then shares a day with a run.
  if (candidates.length < 2) candidates = [...DAY_KEYS];
  const scored = Object.fromEntries(candidates.map((d) => [d, dayScore(d, runDays)]));
  let best = null;
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      let total = scored[a].score + scored[b].score;
      if (consecutive(a, b)) total -= 6;
      const preferred = a === 'tue' && b === 'thu';
      if (!best || total > best.total || (total === best.total && preferred)) best = { a, b, total };
    }
  }
  const reasonFor = (d, id) => {
    const { notes } = scored[d];
    const why = notes.length ? notes.join('; ') : 'no hard run the next day';
    return `${DAY_NAMES[d]}: Session ${id}. ${why.charAt(0).toUpperCase()}${why.slice(1)}.`;
  };
  return {
    strengthDays: { [best.a]: 'A', [best.b]: 'B' },
    reasons: [reasonFor(best.a, 'A'), reasonFor(best.b, 'B')],
  };
}

export const PHASES = {
  establish: { label: 'Establish', text: 'Learn the movements and settle your starting reps. Keep 2–3 reps in reserve. No increases yet.' },
  build: { label: 'Build', text: 'Add 1–2 reps where every set was clean and manageable. Not every exercise at once.' },
  intensify: { label: 'Intensify selectively', text: 'When the top of a range is comfortable, change one thing: slower tempo, longer pause, a harder version or an extra set.' },
  consolidate: { label: 'Consolidate', text: 'Hold steady or progress a little. Plan your benchmark tests for the end of the block.' },
  review: { label: 'Block review', text: 'Block finished. Do your benchmark tests, review how running and strength went, then start the next block.' },
};

export function blockInfo(state, today) {
  const start = state.block && state.block.startDate;
  if (!start) return { number: 1, week: 1, phase: 'establish', ...PHASES.establish };
  const week = Math.floor(daysBetween(weekStart(start), weekStart(today)) / 7) + 1;
  let phase = 'review';
  if (week <= 2) phase = 'establish';
  else if (week <= 4) phase = 'build';
  else if (week <= 6) phase = 'intensify';
  else if (week <= 8) phase = 'consolidate';
  return { number: state.block.number || 1, week: Math.max(1, week), phase, ...PHASES[phase] };
}

export function runProtection(state, iso) {
  const runDays = state.schedule.runDays || {};
  const d1 = dayKey(addDays(iso, 1));
  const d2 = dayKey(addDays(iso, 2));
  let daysToLong = null;
  if (runDays[d1] === 'long') daysToLong = 1;
  else if (runDays[d2] === 'long') daysToLong = 2;
  return {
    longRunSoon: daysToLong !== null,
    daysToLong,
    longDayName: daysToLong ? DAY_NAMES[daysToLong === 1 ? d1 : d2] : null,
    qualityTomorrow: runDays[d1] === 'quality',
    qualityDayName: runDays[d1] === 'quality' ? DAY_NAMES[d1] : null,
  };
}

function plannedFor(schedule, key) {
  const items = [];
  if (Object.prototype.hasOwnProperty.call(schedule.runDays, key)) items.push({ kind: 'run', runType: schedule.runDays[key] || 'other' });
  if (schedule.strengthDays[key]) items.push({ kind: 'strength', sessionId: schedule.strengthDays[key] });
  return items;
}

export function weekModel(state, today) {
  const isos = weekDays(today);
  const inWeek = (x) => x.date >= isos[0] && x.date <= isos[6];
  const runs = state.runLogs.filter(inWeek);
  const lifts = state.strengthLogs.filter(inWeek);
  const days = isos.map((iso) => ({
    iso,
    key: dayKey(iso),
    isToday: iso === today,
    planned: plannedFor(state.schedule, dayKey(iso)).map((p) => ({ ...p })),
    runs: runs.filter((r) => r.date === iso),
    lifts: lifts.filter((l) => l.date === iso),
    checkin: state.checkins.find((c) => c.date === iso) || null,
  }));

  // Planned runs: a run on the same day first, then any other run this week fills the earliest open slot.
  const usedRuns = new Set();
  const runSlots = days.flatMap((d) => d.planned.filter((p) => p.kind === 'run').map((p) => ({ d, p })));
  for (const { d, p } of runSlots) {
    const same = d.runs.find((r) => !usedRuns.has(r.id));
    if (same) { usedRuns.add(same.id); p.status = 'done'; p.logId = same.id; }
  }
  for (const { p } of runSlots) {
    if (p.status) continue;
    const other = runs.find((r) => !usedRuns.has(r.id));
    if (other) { usedRuns.add(other.id); p.status = 'moved'; p.logId = other.id; }
  }
  // Planned strength: any log of that session this week.
  for (const d of days) {
    for (const p of d.planned.filter((x) => x.kind === 'strength')) {
      const log = lifts.find((l) => l.sessionId === p.sessionId);
      if (log) { p.status = log.date === d.iso ? 'done' : 'moved'; p.logId = log.id; }
    }
  }
  for (const d of days) {
    for (const p of d.planned) {
      if (!p.status) p.status = d.iso < today ? 'missed' : d.iso === today ? 'today' : 'upcoming';
    }
  }

  let nextUp = null;
  for (const d of days) {
    if (d.iso < today) continue;
    const open = d.planned.find((p) => p.status === 'today' || p.status === 'upcoming');
    if (open) { nextUp = { iso: d.iso, item: open }; break; }
  }
  if (!nextUp) {
    for (let i = 1; i <= 7 && !nextUp; i++) {
      const iso = addDays(isos[6], i);
      const items = plannedFor(state.schedule, dayKey(iso));
      if (items.length) nextUp = { iso, item: items[0] };
    }
  }

  return {
    weekStart: isos[0],
    days,
    runKm: Math.round(runs.reduce((s, r) => s + (Number(r.distanceKm) || 0), 0) * 10) / 10,
    runsDone: runs.length,
    runsPlanned: Object.keys(state.schedule.runDays).length,
    strengthDone: lifts.length,
    strengthPlanned: Object.keys(state.schedule.strengthDays).length,
    nextUp,
  };
}

export function scheduleWarnings(schedule) {
  const out = [];
  const strength = Object.entries(schedule.strengthDays);
  for (const [key, id] of strength) {
    const n1 = schedule.runDays[next(key)];
    if (n1 === 'long') {
      out.push({ level: 'warn', text: `Session ${id} on ${DAY_NAMES[key]} is the day before your long run. Move it if you can, or keep the legs very light.` });
    } else if (n1 === 'quality') {
      out.push({ level: 'info', text: `Session ${id} on ${DAY_NAMES[key]} is the day before your quality run: keep lower-body sets 2–3 reps short of failure.` });
    }
    if (Object.prototype.hasOwnProperty.call(schedule.runDays, key)) {
      out.push({ level: 'info', text: `Session ${id} shares ${DAY_NAMES[key]} with a run. Run first, or keep the strength work light.` });
    }
  }
  if (strength.length === 2 && consecutive(strength[0][0], strength[1][0])) {
    out.push({ level: 'warn', text: 'Your two strength sessions are back-to-back. A day between them helps recovery.' });
  }
  return out;
}
