// Sample data for screenshots and manual checks: open the app with ?demo=1 (four weeks in),
// ?demo=fresh (first run), ?demo=logging (a session in progress) or ?demo=review (a finished block).
// Lives in memory only.
import { emptyState, memoryStorage, saveState } from '../store.js';
import { buildSetupState } from '../ui/setup.js';
import { createDraft, finishDraft } from '../draft.js';
import { addDays } from '../dates.js';

export const DEMO_NOW = new Date(2026, 10, 26, 7, 30);
const REVIEW_NOW = new Date(2027, 0, 1, 8, 0);

export function demoNow(kind) {
  return kind === 'review' ? REVIEW_NOW : DEMO_NOW;
}
const START = '2026-11-02';

let n = 0;
const id = (p) => `${p}-demo-${++n}`;

function lift(s, sessionId, date, week, opts = {}) {
  const d = createDraft(s, sessionId, date, { nowIso: `${date}T18:00:00.000Z` });
  d.energyBefore = 4;
  d.rpe = week < 2 ? 6 : 7;
  for (const e of d.exercises) {
    const t = e.target;
    const top = week >= 2 && (opts.top || []).includes(e.exerciseId);
    for (const r of e.rows) {
      r.value = top ? t.max : Math.min(t.max - 1, t.min + week);
      if (t.unit === 'seconds') r.value = top ? t.max : t.min + 5 * week;
      r.rir = week < 2 ? 3 : (top ? 2 : 1);
      r.done = true;
    }
  }
  const log = finishDraft(d, { nowMs: Date.parse(`${date}T18:${36 + week}:00.000Z`), id: id('str') });
  s.strengthLogs.push(log);
}

// A finished 8-week block: steady sessions, a couple of step-ups, pain flagged twice on pike push-ups.
function reviewState(base) {
  const s = base;
  for (let w = 0; w < 8; w++) {
    const mon = addDays(START, 7 * w);
    lift(s, 'A', addDays(mon, 1), Math.min(w, 3), { top: ['press-up'] });
    lift(s, 'B', addDays(mon, 3), Math.min(w, 3), { top: ['side-plank'] });
  }
  s.strengthLogs.filter((l) => l.sessionId === 'B').slice(-2).forEach((l) => { l.exercises[2].pain = true; });
  for (const [exerciseId, sessionId, at] of [['press-up', 'A', '2026-11-20'], ['press-up', 'A', '2026-12-04'], ['side-plank', 'B', '2026-11-27']]) {
    s.decisions.push({ key: id('dec'), status: 'accepted', at, planVersion: null, sessionId, exerciseId, kind: 'progress' });
  }
  s.benchmarks.push({ id: id('bench'), date: '2026-12-29', pressUps: 25, plankSec: 75, bridgeLeft: 8, bridgeRight: 7, squats: 26, lunges: 12, notes: 'End of block 1' });
  s.settings.lastBackupAt = '2026-12-29';
  s.settings.installHintDismissed = true;
  return s;
}

export function demoState(kind) {
  let s = emptyState(new Date(2026, 10, 2));
  if (kind === 'fresh') return s;
  s = buildSetupState(s, {
    strengthDays: { tue: 'A', thu: 'B' },
    conventions: { lungeBaselinePerLeg: true, bridgeBaselinePerLeg: true },
    base: { pressUps: 20, squats: 20, lunges: 10, plankSec: 60, bridge: 5 },
    profile: { age: null, heightCm: null, weightKg: null },
  }, START);
  if (kind === 'review') return reviewState(s);
  for (let w = 0; w < 4; w++) {
    const mon = addDays(START, 7 * w);
    lift(s, 'A', addDays(mon, 1), w, { top: ['press-up', 'dead-bug'] });
    s.checkins.push({ id: id('chk'), date: addDays(mon, 2), energy: 4, sleep: w === 1 ? 3 : 4, legSoreness: 2, pain: '' });
    if (w < 3) {
      lift(s, 'B', addDays(mon, 3), w, { top: ['side-plank'] });
      s.checkins.push({ id: id('chk'), date: addDays(mon, 4), energy: 4, sleep: 4, legSoreness: w === 0 ? 3 : 2, pain: '' });
    }
  }
  s.settings.lastBackupAt = '2026-11-08';
  s.settings.installHintDismissed = true;
  if (kind === 'logging') {
    const d = createDraft(s, 'B', '2026-11-26', { nowIso: new Date(DEMO_NOW.getTime() - 14 * 60000).toISOString() });
    d.energyBefore = 4;
    d.exercises[0].rows.forEach((r) => { r.done = true; r.rir = 2; });
    d.exercises[1].rows[0].done = true;
    d.exercises[1].rows[0].rir = 2;
    s.draft = d;
  }
  return s;
}

export function demoStorage(kind) {
  const st = memoryStorage();
  if (kind !== 'fresh') saveState(st, demoState(kind));
  return st;
}
