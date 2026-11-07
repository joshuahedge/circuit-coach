// Weekly schedule: two strength sessions on days you choose, the block week, and the week view model.
import { DAY_KEYS, DAY_NAMES, addDays, dayKey, daysBetween, weekDays, weekStart } from './dates.js';

// Two or three rest days between the sessions by default.
export const DEFAULT_DAYS = { tue: 'A', fri: 'B' };

function consecutive(a, b) {
  const i = DAY_KEYS.indexOf(a);
  const j = DAY_KEYS.indexOf(b);
  return Math.abs(i - j) === 1 || (Math.min(i, j) === 0 && Math.max(i, j) === 6);
}

export const PHASES = {
  establish: { label: 'Establish', text: 'Learn the movements and settle your starting reps. Keep 2–3 reps in reserve. No increases yet.' },
  build: { label: 'Build', text: 'Add 1–2 reps where every set was clean and manageable. Not every exercise at once.' },
  intensify: { label: 'Intensify selectively', text: 'When the top of a range is comfortable, change one thing: slower tempo, longer pause, a harder version or an extra set.' },
  consolidate: { label: 'Consolidate', text: 'Hold steady or progress a little. Plan your benchmark tests for the end of the block.' },
  review: { label: 'Block review', text: 'Block finished. Do your benchmark tests, look back at how the block went, then start the next block.' },
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

function plannedFor(schedule, key) {
  const id = schedule.strengthDays && schedule.strengthDays[key];
  return id ? [{ kind: 'strength', sessionId: id }] : [];
}

export function weekModel(state, today) {
  const isos = weekDays(today);
  const inWeek = (x) => x.date >= isos[0] && x.date <= isos[6];
  const lifts = state.strengthLogs.filter(inWeek);
  const days = isos.map((iso) => ({
    iso,
    key: dayKey(iso),
    isToday: iso === today,
    planned: plannedFor(state.schedule, dayKey(iso)).map((p) => ({ ...p })),
    lifts: lifts.filter((l) => l.date === iso),
    checkin: state.checkins.find((c) => c.date === iso) || null,
  }));

  // A planned session is done by any log of that session this week (on its day, or moved to another).
  const used = new Set();
  for (const d of days) {
    for (const p of d.planned) {
      const log = lifts.find((l) => l.sessionId === p.sessionId && !used.has(l.id));
      if (log) { used.add(log.id); p.status = log.date === d.iso ? 'done' : 'moved'; p.logId = log.id; }
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
    strengthDone: lifts.length,
    strengthPlanned: Object.keys(state.schedule.strengthDays || {}).length,
    extraIds: lifts.filter((l) => !used.has(l.id)).map((l) => l.id),
    nextUp,
  };
}

export function scheduleWarnings(schedule) {
  const out = [];
  const days = Object.keys(schedule.strengthDays || {});
  if (days.length === 2 && consecutive(days[0], days[1])) {
    out.push({ level: 'warn', text: `Session ${schedule.strengthDays[days[0]]} and Session ${schedule.strengthDays[days[1]]} are on back-to-back days (${DAY_NAMES[days[0]]} and ${DAY_NAMES[days[1]]}). A day or two between them helps recovery.` });
  }
  return out;
}
