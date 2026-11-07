// The whole app state is one JSON document in localStorage. The copy before the last save is kept under
// PREV_KEY so a bad write can be recovered. Backups are the same document wrapped with an app id.
import { todayISO } from './dates.js';

export const APP_ID = 'strength-run-coach';
export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'src-state';
export const PREV_KEY = 'src-state-prev';
export const REPLACED_KEY = 'src-state-replaced';

export function emptyState(now = new Date()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: todayISO(now),
    setupDone: false,
    profile: {
      age: null,
      heightCm: null,
      weightKg: null,
      level: 'intermediate',
      goals: [
        'Build muscle and improve physique',
        'Functional strength',
        'Core strength and stability',
        'Mobility and flexibility',
        'Support 10K running performance',
      ],
      equipment: ['bodyweight', 'exercise mat'],
      disliked: ['burpees', 'mountain climbers'],
      sessionMinutes: [35, 40],
    },
    conventions: { lungeBaselinePerLeg: null, bridgeBaselinePerLeg: null },
    schedule: { runDays: { mon: null, wed: null, sat: null }, strengthDays: {} },
    block: { number: 1, startDate: null },
    plans: [],
    strengthLogs: [],
    runLogs: [],
    checkins: [],
    benchmarks: [],
    decisions: [],
    draft: null,
    settings: { lastBackupAt: null, installHintDismissed: false },
  };
}

export function migrate(raw) {
  if (raw.schemaVersion > SCHEMA_VERSION) throw new Error('newer');
  const base = emptyState();
  const out = { ...base, ...raw, schemaVersion: SCHEMA_VERSION };
  for (const k of ['profile', 'conventions', 'schedule', 'block', 'settings']) {
    out[k] = { ...base[k], ...(raw[k] || {}) };
  }
  for (const k of ['plans', 'strengthLogs', 'runLogs', 'checkins', 'benchmarks', 'decisions']) {
    out[k] = Array.isArray(raw[k]) ? raw[k] : [];
  }
  if (out.draft === undefined) out.draft = null;
  return out;
}

// A set-up state must carry a plan with both sessions, or every screen that reads the plan fails.
export function usable(state) {
  if (!state.setupDone) return true;
  const plan = Array.isArray(state.plans) && state.plans[state.plans.length - 1];
  return Boolean(plan && plan.sessions && plan.sessions.A && plan.sessions.B
    && Array.isArray(plan.sessions.A.exercises) && Array.isArray(plan.sessions.B.exercises));
}

function read(storage, key) {
  let raw;
  try { raw = storage.getItem(key); } catch (e) { return { bad: true }; }
  if (!raw) return { missing: true };
  let v;
  try { v = JSON.parse(raw); } catch (e) { return { bad: true }; }
  if (!v || typeof v !== 'object' || typeof v.schemaVersion !== 'number') return { bad: true };
  if (v.schemaVersion > SCHEMA_VERSION) return { newer: true };
  const value = migrate(v);
  return usable(value) ? { value } : { bad: true };
}

export function loadState(storage, now = new Date()) {
  const main = read(storage, STORAGE_KEY);
  if (main.value) return { state: main.value, source: 'main' };
  if (main.newer) return { state: null, source: 'newer' };
  const prev = read(storage, PREV_KEY);
  if (main.missing && prev.missing) return { state: emptyState(now), source: 'new' };
  if (prev.value) return { state: prev.value, source: 'prev' };
  return { state: null, source: 'failed' };
}

function parses(text) {
  try { JSON.parse(text); return true; } catch (e) { return false; }
}

export function saveState(storage, state) {
  let json;
  try { json = JSON.stringify(state); } catch (e) { return false; }
  let old = null;
  try { old = storage.getItem(STORAGE_KEY); } catch (e) { old = null; }
  try {
    if (old && old !== json && parses(old)) storage.setItem(PREV_KEY, old);
  } catch (e) {
    try { storage.removeItem(PREV_KEY); } catch (e2) { /* ignore */ }
  }
  try {
    storage.setItem(STORAGE_KEY, json);
    return true;
  } catch (e) {
    // Out of room: the main copy matters more than the previous one.
    try {
      storage.removeItem(PREV_KEY);
      storage.setItem(STORAGE_KEY, json);
      return true;
    } catch (e2) {
      return false;
    }
  }
}

// Before a restore or an erase, keep what was there under its own key so it can be undone.
export function stashBeforeReplace(storage) {
  try {
    const old = storage.getItem(STORAGE_KEY);
    if (old && parses(old)) storage.setItem(REPLACED_KEY, old);
    return Boolean(old);
  } catch (e) {
    return false;
  }
}

export function readStash(storage) {
  const r = read(storage, REPLACED_KEY);
  return r.value || null;
}

export function makeBackup(state, now = new Date()) {
  const payload = { app: APP_ID, exportedAt: now.toISOString(), schemaVersion: SCHEMA_VERSION, state };
  return { filename: `${APP_ID}-backup-${todayISO(now)}.json`, json: JSON.stringify(payload) };
}

export function readBackup(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { return { ok: false, error: 'The file could not be read as a backup.' }; }
  if (!parsed || parsed.app !== APP_ID || typeof parsed.state !== 'object' || parsed.state === null) {
    return { ok: false, error: 'This file is not a Strength & Running Coach backup.' };
  }
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of the app. Update the app first.' };
  }
  const state = migrate({ ...parsed.state, schemaVersion: parsed.state.schemaVersion || 1 });
  if (!usable(state)) return { ok: false, error: 'This backup is incomplete (it has no training plan) and cannot be restored.' };
  const dates = [...state.strengthLogs, ...state.runLogs, ...state.checkins, ...state.benchmarks]
    .map((x) => x.date).filter(Boolean).sort();
  return {
    ok: true,
    state,
    summary: {
      exportedAt: parsed.exportedAt || null,
      strengthCount: state.strengthLogs.length,
      runCount: state.runLogs.length,
      checkinCount: state.checkins.length,
      firstDate: dates[0] || null,
      lastDate: dates[dates.length - 1] || null,
    },
  };
}

let counter = 0;
export function newId(prefix) {
  counter = (counter + 1) % 1e6;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
}
