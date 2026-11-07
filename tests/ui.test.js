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

  it('a three-tap morning check-in saves itself, with Undo', () => {
    const { app, root } = mount(setupState(), '2026-11-04');
    const card = () => [...root.querySelectorAll('.card')].find((c) => c.textContent.includes('This morning'));
    const pick = (label, value) => [...card().querySelectorAll(`[aria-label="${label}"] .chip`)].find((b) => b.textContent === value).click();
    pick('Energy', '4');
    pick('Sleep', '3');
    expect(app.state.checkins.length).toBe(0);
    pick('Leg soreness', '2');
    expect(app.state.checkins.length).toBe(1);
    expect(app.state.checkins[0]).toEqual({ ...app.state.checkins[0], date: '2026-11-04', energy: 4, sleep: 3, legSoreness: 2 });
    expect(card()).toBe(undefined);
    click(root.querySelector('.toast'), 'Undo');
    expect(app.state.checkins.length).toBe(0);
  });

  it('Start on the Week screen opens the workout straight away', () => {
    const { app, root } = mount(setupState(), '2026-11-05');
    click(root.querySelector('.next-card'), 'Start Session B');
    expect(app.route.name).toBe('strength');
    expect(app.state.draft.sessionId).toBe('B');
    expect(app.state.draft.runProtect).toBe(true);
    expect(root.querySelector('.dock')).toBeTruthy();
  });
});

describe('ui: logging', () => {
  it('logs a full strength session', () => {
    const { app, root } = mount(setupState(), '2026-11-03');
    app.go('#/log/strength/A');
    click(root, 'Start Session A');
    expect(app.state.draft.sessionId).toBe('A');
    click(root, 'More: Press-up, set 1');
    expect(app.state.draft.exercises[1].rows[0].value).toBe(9);
    const ticks = [...root.querySelectorAll('.tick')];
    expect(ticks.length).toBe(25);
    ticks.forEach((t) => t.click());
    expect(app.state.draft.exercises[0].rows.every((r) => r.done)).toBe(true);
    expect(root.querySelectorAll('.tick').length).toBe(0);
    click(root, 'Edit Press-up, set 1');
    click(root, 'Less: Press-up, set 1');
    click(root, 'Save Press-up, set 1');
    expect(app.state.draft.exercises[1].rows[0].value).toBe(8);
    expect(app.state.draft.exercises[1].rows[0].done).toBe(true);
    click(root, 'Edit Press-up, set 1');
    click(root, 'More: Press-up, set 1');
    click(root, 'Save Press-up, set 1');
    expect(root.querySelector('.dock').textContent).toContain('Every set done');
    expect(root.querySelector('.tabbar')).toBe(null);
    click(root, 'Finish');
    click(root, 'Save session');
    expect(app.state.strengthLogs.length).toBe(0);
    expect(root.querySelector('.sheet').textContent).toContain('Pick your session effort first');
    const effort = [...root.querySelectorAll('[aria-label="Session effort"] .chip')].find((b) => b.textContent === '7');
    effort.click();
    click(root, 'Save session');
    expect(app.state.draft).toBe(null);
    expect(app.state.strengthLogs.length).toBe(1);
    const log = app.state.strengthLogs[0];
    expect(log.rpe).toBe(7);
    expect(log.exercises.every((e) => e.status === 'done')).toBe(true);
    expect(log.exercises[1].sets[0].value).toBe(9);
  });

  it('the dock walks through sets, rests and reps in reserve', () => {
    const { app, root } = mount(setupState(), '2026-11-03');
    app.go('#/log/strength/A');
    click(root, 'Start Session A');
    const dock = () => root.querySelector('.dock');
    expect(dock().textContent).toContain('Warm-up');
    click(dock(), 'Start warm-up timer');
    expect(app.state.draft.warmup.endsAt).toBeGreaterThan(0);
    click(dock(), 'Warmed up: first set');
    expect(dock().textContent).toContain('Reverse lunge');
    expect(dock().textContent).toContain('8–10 reps per leg · 2 s down');
    expect(dock().textContent.includes('null') || dock().textContent.includes('undefined')).toBe(false);
    expect(dock().textContent).toContain('Set 1 of 3 · Left');
    click(dock(), 'Done');
    expect(app.state.draft.rest).toBe(null);
    expect(dock().textContent).toContain('Set 1 of 3 · Right');
    click(dock(), 'Done');
    expect(app.state.draft.rest.total).toBe(45);
    expect(dock().textContent).toContain('Rest');
    expect(dock().textContent).toContain('Next: Press-up · Set 1 of 3');
    [...dock().querySelectorAll('.chip')].find((b) => b.textContent === '2').click();
    expect(app.state.draft.exercises[0].rows.slice(0, 2).map((r) => r.rir)).toEqual([2, 2]);
    click(dock(), '15 seconds more');
    expect(app.state.draft.rest.total).toBe(60);
    click(dock(), 'Skip rest');
    expect(app.state.draft.rest).toBe(null);
    expect(dock().textContent).toContain('Press-up');
    expect(root.querySelector('.setrow.is-next').dataset.ref).toBe('1:0');
  });

  it('order and rest settings change the flow', () => {
    const { app, root } = mount(setupState(), '2026-11-03');
    app.go('#/log/strength/A');
    click(root, 'Start Session A');
    click(root, 'Order and rest settings');
    click(root, 'One exercise at a time');
    click(root, '90 s');
    click(root.querySelector('.sheet'), 'Done');
    expect(app.state.settings.flow).toBe('sets');
    expect(app.state.settings.restLong).toBe(90);
    const dock = () => root.querySelector('.dock');
    click(dock(), 'Skip');
    click(dock(), 'Done');
    click(dock(), 'Done');
    expect(app.state.draft.rest.total).toBe(90);
    expect(dock().textContent).toContain('Next: Reverse lunge · Set 2 of 3');
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

  it('a run on a non-run day asks whether it replaces a planned run', () => {
    const s = setupState();
    addRun(s, '2026-11-02', { km: 5, sec: 1950, type: 'easy' });
    const { app, root } = mount(s, '2026-11-05');
    app.go('#/log/run');
    click(root, 'Easy 5.0 km · 32:30');
    expect(root.querySelector('[aria-label="Distance in km"]').value).toBe('5');
    expect(root.textContent).toContain('This run is');
    click(root, 'Sat long run, moved');
    click(root, 'Long');
    click(root, 'Save run');
    const r = app.state.runLogs[1];
    expect(r.forDay).toBe('2026-11-07');
    expect(r.runType).toBe('long');
    expect(r.durationSec).toBe(1950);
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

  it('deletes a log with Undo', () => {
    const s = setupState();
    addRun(s, '2026-11-02', { km: 5 });
    const { app, root } = mount(s, '2026-11-04');
    app.go('#/log');
    all(root, '.list-item').find((b) => b.textContent.includes('Easy run')).click();
    click(root, 'Delete');
    expect(app.state.runLogs.length).toBe(0);
    click(root.querySelector('.toast'), 'Undo');
    expect(app.state.runLogs.length).toBe(1);
  });

  it('a saved session shows a summary and can be edited', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-03', { ex: { 'press-up': { value: 9 } } });
    const { app, root } = mount(s, '2026-11-05');
    app.go('#/log/strength/A');
    click(root, 'Start Session A');
    [...root.querySelectorAll('.tick')].forEach((t) => t.click());
    click(root, 'Finish');
    [...root.querySelectorAll('[aria-label="Session effort"] .chip')].find((b) => b.textContent === '6').click();
    click(root, 'Save session');
    expect(app.route.name).toBe('summary');
    expect(root.textContent).toContain('Compared with 3 Nov');
    expect(root.textContent).toContain('same as last time');
    const id = app.route.id;
    click(root, 'Edit session');
    expect(app.state.draft.editingId).toBe(id);
    click(root, 'Edit Press-up, set 1');
    click(root, 'More: Press-up, set 1');
    click(root, 'Save Press-up, set 1');
    click(root, 'Finish');
    click(root, 'Save session');
    expect(app.state.strengthLogs.length).toBe(2);
    expect(app.state.strengthLogs.find((l) => l.id === id).exercises[1].sets[0].value).toBe(10);
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
    expect(root.textContent).toContain('What the coach saw');
    click(root, 'Accept');
    expect(app.state.plans.length).toBe(2);
    expect(currentPlan(app.state).sessions.A.exercises[1].max).toBe(13);
    const ghost = root.querySelector('.card.ghost');
    expect(ghost.textContent).toContain('Accepted');
    click(ghost, 'Undo');
    expect(app.state.plans.length).toBe(1);
    expect(app.state.decisions.length).toBe(0);
    expect(root.textContent).toContain('Press-up: add a rep');
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

  it('deleting a run from its edit screen can be undone', () => {
    const s = setupState();
    const run = addRun(s, '2026-11-02', { km: 5 });
    const { app, root } = mount(s, '2026-11-04');
    app.go(`#/log/run/${run.id}`);
    click(root, 'Delete run');
    expect(app.state.runLogs.length).toBe(0);
    click(root.querySelector('.toast'), 'Undo');
    expect(app.state.runLogs[0].id).toBe(run.id);
  });

  it('the block review cannot be dismissed, only acted on', async () => {
    const { app, root } = mount(setupState(), '2027-01-01');
    app.go('#/coach');
    const card = [...root.querySelectorAll('.card')].find((c) => c.textContent.includes('Block 1 finished'));
    expect(Boolean(btn(card, 'Start next block'))).toBe(true);
    expect(btn(card, 'Got it')).toBe(undefined);
    btn(card, 'Start next block').click();
    await tick();
    root.querySelector('[data-confirm]').click();
    await tick();
    expect(app.state.block.number).toBe(2);
  });

  it('erase and restore can be undone', () => {
    const s = setupState();
    addRun(s, '2026-11-02', { km: 5 });
    const { app } = mount(s);
    app.replaceState(emptyState(new Date(2026, 10, 20)));
    expect(app.state.setupDone).toBe(false);
    expect(app.undoReplace()).toBe(true);
    expect(app.state.runLogs.length).toBe(1);
  });

  it('the 10K is entered as minutes and seconds', () => {
    const { app, root } = mount(setupState(), '2026-11-30');
    app.go('#/log/benchmark');
    type(root.querySelector('[aria-label="10K minutes"]'), '64');
    type(root.querySelector('[aria-label="10K seconds"]'), '32');
    click(root, 'Save benchmark');
    expect(app.state.benchmarks[1].tenKSec).toBe(3872);
    app.go('#/log/benchmark');
    type(root.querySelector('[aria-label="10K minutes"]'), '6432');
    click(root, 'Save benchmark');
    expect(app.state.benchmarks.length).toBe(2);
  });

  it('unreadable saved data shows the recovery screen', () => {
    const root = document.getElementById('mount');
    const st = memoryStorage();
    st.setItem('src-state', 'broken');
    createApp({ root, storage: st, useHash: false, win: window });
    expect(root.textContent).toContain('Saved data could not be read');
  });
});
