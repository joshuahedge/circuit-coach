// Sample data for screenshots and manual checks: open the app with ?demo=1 (four weeks in),
// ?demo=fresh (first run) or ?demo=logging (a session in progress). Lives in memory only.
import { emptyState, memoryStorage, saveState } from '../store.js';
import { buildSetupState } from '../ui/setup.js';
import { createDraft, finishDraft } from '../draft.js';
import { addDays } from '../dates.js';

export const DEMO_NOW = new Date(2026, 10, 26, 7, 30);
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

export function demoState(kind) {
  let s = emptyState(new Date(2026, 10, 2));
  if (kind === 'fresh') return s;
  s = buildSetupState(s, {
    strengthDays: { tue: 'A', thu: 'B' },
    conventions: { lungeBaselinePerLeg: true, bridgeBaselinePerLeg: true },
    base: { pressUps: 20, squats: 20, lunges: 10, plankSec: 60, bridge: 5 },
    profile: { age: null, heightCm: null, weightKg: null },
  }, START);
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
