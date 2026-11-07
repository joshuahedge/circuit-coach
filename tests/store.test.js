import { describe, it, expect } from './harness.js';
import {
  STORAGE_KEY, PREV_KEY, SCHEMA_VERSION, APP_ID, emptyState, loadState, saveState, migrate, makeBackup, readBackup,
  newId, memoryStorage, stashBeforeReplace, readStash,
} from '../src/store.js';

const NOW = new Date(2026, 10, 9, 8, 0);

describe('store', () => {
  it('empty state has every collection and no setup yet', () => {
    const s = emptyState(NOW);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.setupDone).toBe(false);
    expect(s.createdAt).toBe('2026-11-09');
    for (const k of ['plans', 'strengthLogs', 'checkins', 'benchmarks', 'decisions']) expect(s[k]).toEqual([]);
    expect('runLogs' in s).toBe(false);
    expect(s.profile.goals.join(' ').includes('10K')).toBe(false);
    expect(s.draft).toBe(null);
    expect(s.profile.weightKg).toBe(null);
    expect(s.profile.disliked).toEqual(['burpees', 'mountain climbers']);
  });

  it('new storage loads an empty state', () => {
    const r = loadState(memoryStorage(), NOW);
    expect(r.source).toBe('new');
    expect(r.state.setupDone).toBe(false);
  });

  it('save then load round-trips', () => {
    const st = memoryStorage();
    const s = emptyState(NOW);
    s.checkins.push({ id: 'c1', date: '2026-11-09', energy: 4 });
    expect(saveState(st, s)).toBe(true);
    const r = loadState(st, NOW);
    expect(r.source).toBe('main');
    expect(r.state.checkins[0].energy).toBe(4);
  });

  it('save keeps the previous good copy', () => {
    const st = memoryStorage();
    const s1 = emptyState(NOW);
    saveState(st, s1);
    const s2 = { ...s1, setupDone: true };
    saveState(st, s2);
    expect(JSON.parse(st.getItem(PREV_KEY)).setupDone).toBe(false);
    expect(JSON.parse(st.getItem(STORAGE_KEY)).setupDone).toBe(true);
  });

  it('a corrupt main copy is never copied over the previous one', () => {
    const st = memoryStorage();
    saveState(st, emptyState(NOW));
    saveState(st, { ...emptyState(NOW), setupDone: true });
    st.setItem(STORAGE_KEY, '{broken');
    saveState(st, { ...emptyState(NOW), setupDone: true, createdAt: '2026-11-10' });
    expect(JSON.parse(st.getItem(PREV_KEY)).setupDone).toBe(false);
  });

  it('corrupt main falls back to the previous copy', () => {
    const st = memoryStorage();
    saveState(st, { ...emptyState(NOW) });
    saveState(st, { ...emptyState(NOW), createdAt: '2026-11-10' });
    st.setItem(STORAGE_KEY, '{oops');
    const r = loadState(st, NOW);
    expect(r.source).toBe('prev');
    expect(r.state.createdAt).toBe('2026-11-09');
  });

  it('both corrupt reports failed', () => {
    const st = memoryStorage();
    st.setItem(STORAGE_KEY, 'nope');
    st.setItem(PREV_KEY, 'nope');
    const r = loadState(st, NOW);
    expect(r.source).toBe('failed');
    expect(r.state).toBe(null);
  });

  it('data from a newer version is not loaded', () => {
    const st = memoryStorage();
    st.setItem(STORAGE_KEY, JSON.stringify({ ...emptyState(NOW), schemaVersion: SCHEMA_VERSION + 1 }));
    expect(loadState(st, NOW).source).toBe('newer');
  });

  it('a failing storage write returns false', () => {
    const st = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(saveState(st, emptyState(NOW))).toBe(false);
  });

  it('migrate fills missing parts', () => {
    const m = migrate({ schemaVersion: 1, setupDone: false, checkins: [{ id: 'x' }] });
    expect(m.strengthLogs).toEqual([]);
    expect(m.checkins.length).toBe(1);
    expect(m.settings.lastBackupAt).toBe(null);
    expect(m.profile.level).toBe('intermediate');
    expect(m.block.number).toBe(1);
  });

  it('makes a backup file', () => {
    const s = emptyState(NOW);
    const b = makeBackup(s, NOW);
    expect(b.filename).toBe('strength-run-coach-backup-2026-11-09.json');
    const parsed = JSON.parse(b.json);
    expect(parsed.app).toBe(APP_ID);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.state.createdAt).toBe('2026-11-09');
  });

  it('reads a backup and summarises it', () => {
    const s = emptyState(NOW);
    s.strengthLogs.push({ id: 's1', date: '2026-11-03' }, { id: 's2', date: '2026-11-06' });
    s.checkins.push({ id: 'c1', date: '2026-11-02' });
    const r = readBackup(makeBackup(s, NOW).json);
    expect(r.ok).toBe(true);
    expect(r.summary.strengthCount).toBe(2);
    expect(r.summary.checkinCount).toBe(1);
    expect(r.summary.firstDate).toBe('2026-11-02');
    expect(r.summary.lastDate).toBe('2026-11-06');
  });

  it('rejects other files', () => {
    expect(readBackup('not json').ok).toBe(false);
    expect(readBackup(JSON.stringify({ app: 'other', schemaVersion: 1, state: {} })).ok).toBe(false);
    const newer = readBackup(JSON.stringify({ app: APP_ID, schemaVersion: SCHEMA_VERSION + 1, state: {} }));
    expect(newer.ok).toBe(false);
    expect(newer.error).toContain('newer');
  });

  it('a full storage drops the previous copy to save the main one', () => {
    const data = new Map();
    let failOnce = true;
    const st = {
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => {
        if (k === STORAGE_KEY && failOnce && data.has(PREV_KEY)) { failOnce = false; throw new Error('QuotaExceededError'); }
        data.set(k, v);
      },
      removeItem: (k) => data.delete(k),
    };
    saveState(st, emptyState(NOW));
    expect(saveState(st, { ...emptyState(NOW), setupDone: false, createdAt: '2026-11-10' })).toBe(true);
    expect(data.has(PREV_KEY)).toBe(false);
    expect(JSON.parse(data.get(STORAGE_KEY)).createdAt).toBe('2026-11-10');
  });

  it('a set-up state without a plan is rejected on load and restore', () => {
    const st = memoryStorage();
    st.setItem(STORAGE_KEY, JSON.stringify({ ...emptyState(NOW), setupDone: true, plans: [] }));
    expect(loadState(st, NOW).source).toBe('failed');
    const r = readBackup(JSON.stringify({ app: APP_ID, schemaVersion: 1, state: { setupDone: true } }));
    expect(r.ok).toBe(false);
    expect(r.error).toContain('incomplete');
  });

  it('keeps the replaced data for undo', () => {
    const st = memoryStorage();
    saveState(st, { ...emptyState(NOW), createdAt: '2026-01-01' });
    expect(stashBeforeReplace(st)).toBe(true);
    saveState(st, emptyState(NOW));
    saveState(st, emptyState(NOW));
    expect(readStash(st).createdAt).toBe('2026-01-01');
  });

  it('ids are unique', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId('s')));
    expect(ids.size).toBe(200);
  });
});
