import { describe, it, expect } from './harness.js';
import { createApp } from '../src/app.js';
import { memoryStorage, saveState, makeBackup, emptyState } from '../src/store.js';
import { currentPlan } from '../src/plan.js';
import { setupState, addLog, addRun } from './fixtures.js';

function mount(state, today = '2026-11-20') {
  const root = document.getElementById('mount');
  root.textContent = '';
  const st = memoryStorage();
  if (state) saveState(st, state);
  const [y, m, d] = today.split('-').map(Number);
  const app = createApp({ root, storage: st, now: () => new Date(y, m - 1, d, 9, 0), useHash: false, win: window });
  app.installed = true;
  app.render();
  return { app, root, st };
}

const all = (root, sel = 'button, a') => [...root.querySelectorAll(sel)];
const btn = (root, text) => all(root).find((b) => b.textContent.trim() === text || b.getAttribute('aria-label') === text);
const click = (root, text) => {
  const b = btn(root, text);
  if (!b) throw new Error(`no button "${text}"`);
  b.click();
};
const type = (input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); };
const tick = () => new Promise((r) => setTimeout(r, 20));

describe('ui: setup', () => {
  it('a fresh app walks through setup into the week', () => {
    const { app, root } = mount(null, '2026-11-09');
    expect(root.textContent).toContain('Strength & Running Coach');
    click(root, 'Start');
    const rundays = [...root.querySelectorAll('.runday')];
    expect(rundays.length).toBe(3);
    btn(rundays[0], 'Easy').click();
    btn([...root.querySelectorAll('.runday')][1], 'Quality').click();
    btn([...root.querySelectorAll('.runday')][2], 'Long').click();
    click(root, 'Next');
    expect(root.textContent).toContain('Starting numbers');
    all(root).filter((b) => b.textContent === 'Per leg').forEach((b) => b.click());
    all(root).filter((b) => b.textContent === 'Per leg').forEach((b) => { if (b.getAttribute('aria-pressed') !== 'true') b.click(); });
    click(root, 'Next');
    expect(root.textContent).toContain('About you');
    click(root, 'Next');
    expect(root.textContent).toContain('Tuesday: Session A');
    expect(root.textContent).toContain('Thursday: Session B');
    click(root, 'Finish');
    const s = app.state;
    expect(s.setupDone).toBe(true);
    expect(s.schedule.strengthDays).toEqual({ tue: 'A', thu: 'B' });
    expect(s.schedule.runDays).toEqual({ mon: 'easy', wed: 'quality', sat: 'long' });
    expect(s.block.startDate).toBe('2026-11-09');
    expect(s.plans.length).toBe(1);
    expect(s.benchmarks[0].pressUps).toBe(20);
    expect(s.benchmarks[0].tenKSec).toBe(3900);
    expect(root.textContent).toContain('This week');
  });

  it('totals start the lunges and bridges lower', () => {
    const { app, root } = mount(null, '2026-11-09');
    click(root, 'Start');
    [...root.querySelectorAll('.runday')].forEach((_, i) => btn([...root.querySelectorAll('.runday')][i], 'Easy').click());
    click(root, 'Next');
    all(root).filter((b) => b.textContent === 'In total').forEach((b) => b.click());
    all(root).filter((b) => b.textContent === 'In total').forEach((b) => { if (b.getAttribute('aria-pressed') !== 'true') b.click(); });
    click(root, 'Next');
    click(root, 'Next');
    click(root, 'Finish');
    const A = currentPlan(app.state).sessions.A.exercises;
    expect([A[0].min, A[0].max]).toEqual([6, 8]);
    expect([A[2].min, A[2].max]).toEqual([3, 5]);
    expect(app.state.benchmarks[0].lunges).toBe(5);
  });
});

describe('ui: week', () => {
  it('shows ticks, totals and next up', () => {
    const s = setupState();
    addRun(s, '2026-11-02', { km: 5 });
    addRun(s, '2026-11-04', { km: 6.5, type: 'tempo' });
    addLog(s, 'A', '2026-11-03');
    const { root } = mount(s, '2026-11-05');
    expect(root.textContent).toContain('2/3');
    expect(root.textContent).toContain('11.5 km');
    expect(root.textContent).toContain('1/2');
    expect(root.querySelector('.next-card').textContent).toContain('Session B');
    expect(root.textContent).toContain('Lighter legs: long run on Saturday');
    expect(root.querySelectorAll('.item.s-done').length).toBe(3);
  });

  it('asks for a check-in the day after strength', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-03');
    const { root } = mount(s, '2026-11-04');
    expect(root.textContent).toContain('How are your legs today?');
  });
});

describe('ui: logging', () => {
  it('logs a full strength session', () => {
    const { app, root } = mount(setupState(), '2026-11-03');
    app.go('#/log/strength/A');
    click(root, 'Start Session A');
    expect(app.state.draft.sessionId).toBe('A');
    const ticks = [...root.querySelectorAll('.tick')];
    expect(ticks.length).toBe(25);
    ticks.forEach((t) => t.click());
    expect(app.state.draft.exercises[0].rows.every((r) => r.done)).toBe(true);
    const more = btn(root, 'More: Set 1 reps');
    more.click();
    expect(app.state.draft.exercises[1].rows[0].value).toBe(9);
    click(root, 'Finish and save');
    expect(app.state.strengthLogs.length).toBe(0);
    const effort = [...root.querySelectorAll('[aria-label="Session effort"] .chip')].find((b) => b.textContent === '7');
    effort.click();
    click(root, 'Finish and save');
    expect(app.state.draft).toBe(null);
    expect(app.state.strengthLogs.length).toBe(1);
    const log = app.state.strengthLogs[0];
    expect(log.rpe).toBe(7);
    expect(log.exercises.every((e) => e.status === 'done')).toBe(true);
    expect(log.exercises[1].sets[0].value).toBe(9);
  });

  it('a draft survives a reload', () => {
    const { app, st } = mount(setupState(), '2026-11-03');
    app.go('#/log/strength/B');
    click(app.root, 'Start Session B');
    app.root.querySelector('.tick').click();
    const root = document.getElementById('mount');
    const again = createApp({ root, storage: st, now: () => new Date(2026, 10, 3, 9, 30), useHash: false, win: window });
    expect(again.state.draft.exercises[0].rows[0].done).toBe(true);
  });

  it('logs a run with pace', () => {
    const { app, root } = mount(setupState(), '2026-11-04');
    app.go('#/log/run');
    type(root.querySelector('[aria-label="Distance in km"]'), '6.5');
    type(root.querySelector('[aria-label="Minutes"]'), '42');
    type(root.querySelector('[aria-label="Seconds"]'), '15');
    expect(root.textContent).toContain('6:30 /km');
    click(root, 'Save run');
    expect(app.state.runLogs.length).toBe(0);
    click(root, 'Tempo');
    click(root, 'Save run');
    const r = app.state.runLogs[0];
    expect(r.distanceKm).toBe(6.5);
    expect(r.durationSec).toBe(2535);
    expect(r.runType).toBe('tempo');
    expect(r.sorenessAffected).toBe(false);
  });

  it('logs a check-in', () => {
    const { app, root } = mount(setupState(), '2026-11-04');
    app.go('#/log/checkin');
    [...root.querySelectorAll('[aria-label="Energy"] .chip')].find((b) => b.textContent === '4').click();
    [...root.querySelectorAll('[aria-label="Leg soreness"] .chip')].find((b) => b.textContent === '4').click();
    click(root, 'Save check-in');
    expect(app.state.checkins[0].energy).toBe(4);
    expect(app.state.checkins[0].legSoreness).toBe(4);
    expect(app.state.checkins[0].date).toBe('2026-11-04');
  });

  it('deletes a log after confirming', async () => {
    const s = setupState();
    addRun(s, '2026-11-02', { km: 5 });
    const { app, root } = mount(s, '2026-11-04');
    app.go('#/log');
    all(root, '.list-item').find((b) => b.textContent.includes('Easy run')).click();
    click(root, 'Delete');
    await tick();
    root.querySelector('[data-confirm]').click();
    await tick();
    expect(app.state.runLogs.length).toBe(0);
  });
});

describe('ui: coach and plan', () => {
  function ready() {
    const s = setupState();
    addLog(s, 'A', '2026-11-17', { ex: { 'press-up': { value: 'top', rir: 2 } } });
    addLog(s, 'A', '2026-11-19', { ex: { 'press-up': { value: 'top', rir: 2 } } });
    return s;
  }

  it('accept creates a plan version', () => {
    const { app, root } = mount(ready());
    app.go('#/coach');
    expect(root.textContent).toContain('Press-up: add a rep');
    expect(root.querySelector('.tabbar .badge').textContent).toBe('1');
    click(root, 'Accept');
    expect(app.state.plans.length).toBe(2);
    expect(currentPlan(app.state).sessions.A.exercises[1].max).toBe(13);
    expect(root.textContent.includes('Press-up: add a rep (')).toBe(false);
  });

  it('reject keeps the plan', () => {
    const { app, root } = mount(ready());
    app.go('#/coach');
    click(root, 'Reject');
    expect(app.state.plans.length).toBe(1);
    expect(app.state.decisions[0].status).toBe('rejected');
  });

  it('edit accepts your numbers', () => {
    const { app, root } = mount(ready());
    app.go('#/coach');
    click(root, 'Edit');
    click(root, 'Less: Top of range');
    click(root, 'Accept with changes');
    expect(currentPlan(app.state).sessions.A.exercises[1].max).toBe(12);
    expect(currentPlan(app.state).sessions.A.exercises[1].min).toBe(9);
  });

  it('plan history can go back a version', async () => {
    const { app, root } = mount(ready());
    app.go('#/coach');
    click(root, 'Accept');
    click(root, 'Go back');
    await tick();
    root.querySelector('[data-confirm]').click();
    await tick();
    expect(app.state.plans.length).toBe(3);
    expect(currentPlan(app.state).sessions.A.exercises[1].max).toBe(12);
  });

  it('plan view changes the schedule', () => {
    const { app, root } = mount(setupState());
    app.go('#/plan');
    expect(root.textContent).toContain('Session A · about');
    click(root, 'Change schedule');
    click(root, 'Session B on Friday');
    expect(root.textContent).toContain('day before your long run');
    click(root, 'Save');
    expect(app.state.schedule.strengthDays).toEqual({ tue: 'A', fri: 'B' });
  });

  it('progress renders with and without data', () => {
    const { app, root } = mount(setupState());
    app.go('#/progress');
    expect(root.textContent).toContain('Weekly running');
    expect(root.textContent).toContain('Log a run to see your pace here.');
    const s = ready();
    addRun(s, '2026-11-16', { km: 5 });
    addRun(s, '2026-11-18', { km: 6, type: 'tempo' });
    const m = mount(s);
    m.app.go('#/progress');
    expect(m.root.querySelectorAll('svg.chart').length).toBeGreaterThan(2);
  });

  it('restore replaces the state', () => {
    const { app } = mount(setupState());
    const other = emptyState(new Date(2026, 0, 1));
    const r = app.restore(makeBackup(other, new Date(2026, 0, 1)).json);
    expect(r.ok).toBe(true);
    expect(app.state.setupDone).toBe(false);
    expect(app.restore('nope').ok).toBe(false);
  });

  it('unreadable saved data shows the recovery screen', () => {
    const root = document.getElementById('mount');
    const st = memoryStorage();
    st.setItem('src-state', 'broken');
    createApp({ root, storage: st, useHash: false, win: window });
    expect(root.textContent).toContain('Saved data could not be read');
  });
});
