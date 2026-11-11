import { describe, it, expect } from './harness.js';
import { createApp } from '../src/app.js';
import { memoryStorage, saveState, makeBackup, emptyState } from '../src/store.js';
import { currentPlan } from '../src/plan.js';
import { setupState, addLog, addCheckin } from './fixtures.js';
import { addDays } from '../src/dates.js';
import { fittedRootPx } from '../src/ui/textSize.js';

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

describe('ui: small phones', () => {
  it('the tab bar sits outside the scrolling frame, and a workout hides it', () => {
    const { app, root } = mount(setupState(), '2026-11-03');
    expect(app.frame.querySelector('.tabbar')).toBe(null);
    expect(root.querySelector('.tabbar')).toBeTruthy();
    app.go('#/log/strength/A');
    click(root, 'Start Session A');
    expect(root.querySelector('.tabbar')).toBe(null);
    expect(app.frame.querySelector('.dock')).toBeTruthy();
  });

  it("iPhone's text size is followed at half strength, 14 to 19 px", () => {
    expect(fittedRootPx(16)).toBe(null);
    expect(fittedRootPx(17)).toBe(16);
    expect(fittedRootPx(19)).toBe(17);
    expect(fittedRootPx(23)).toBe(19);
    expect(fittedRootPx(53)).toBe(19);
    expect(fittedRootPx(14)).toBe(14.5);
    expect(fittedRootPx(NaN)).toBe(null);
  });
});

describe('ui: setup', () => {
  it('a fresh app walks through setup into the week', () => {
    const { app, root } = mount(null, '2026-11-09');
    expect(root.textContent).toContain('Circuit Coach');
    click(root, 'Start');
    expect(root.textContent).toContain('Your training days');
    expect(btn(root, 'Session A on Tuesday').getAttribute('aria-pressed')).toBe('true');
    expect(btn(root, 'Session B on Friday').getAttribute('aria-pressed')).toBe('true');
    click(root, 'Session B on Thursday');
    click(root, 'Next');
    expect(root.textContent).toContain('Starting numbers');
    all(root).filter((b) => b.textContent === 'Per leg').forEach((b) => b.click());
    all(root).filter((b) => b.textContent === 'Per leg').forEach((b) => { if (b.getAttribute('aria-pressed') !== 'true') b.click(); });
    expect(root.textContent.includes('10K')).toBe(false);
    click(root, 'Next');
    expect(root.textContent).toContain('About you');
    click(root, 'Finish');
    const s = app.state;
    expect(s.setupDone).toBe(true);
    expect(s.schedule).toEqual({ strengthDays: { tue: 'A', thu: 'B' } });
    expect(s.block.startDate).toBe('2026-11-09');
    expect(s.plans.length).toBe(1);
    expect(s.benchmarks[0].pressUps).toBe(20);
    expect('tenKSec' in s.benchmarks[0]).toBe(false);
    expect(root.textContent).toContain('This week');
  });
  it('totals start the lunges and bridges lower', () => {
    const { app, root } = mount(null, '2026-11-09');
    click(root, 'Start');
    click(root, 'Next');
    all(root).filter((b) => b.textContent === 'In total').forEach((b) => b.click());
    all(root).filter((b) => b.textContent === 'In total').forEach((b) => { if (b.getAttribute('aria-pressed') !== 'true') b.click(); });
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
    addLog(s, 'A', '2026-11-03');
    const { root } = mount(s, '2026-11-05');
    expect(root.textContent).toContain('1/2');
    expect(root.textContent).toContain('sessions this week');
    expect(root.querySelector('.next-card').textContent).toContain('Session B');
    expect(root.querySelectorAll('.item.s-done').length).toBe(1);
    expect(/(run|runs|running|km)/i.test(root.querySelector('.content').textContent)).toBe(false);
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
    expect(dock().textContent).toContain('Warm-up · 5 min');
    click(dock(), 'Start warm-up');
    expect(app.state.draft.warmup.guide.idx).toBe(0);
    expect(dock().querySelector('.dock-title').textContent).toBe('March or jog on the spot');
    expect(dock().textContent).toContain('Move 1 of 6 · Next: Bodyweight squats');
    click(dock(), 'Skip move');
    expect(dock().querySelector('.dock-title').textContent).toBe('Bodyweight squats');
    expect(dock().textContent).toContain('Move 2 of 6 · Next: Alternating reverse lunges');
    click(dock(), 'Pause');
    expect(app.state.draft.warmup.guide.pausedLeft).toBeGreaterThan(0);
    click(dock(), 'Resume');
    expect(app.state.draft.warmup.guide.pausedLeft).toBe(null);
    click(dock(), 'End warm-up');
    expect(app.state.draft.warmup.done).toBe(true);
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

  it('the warm-up moves on by itself, catches up after a lock, and a cool-down comes before Finish', () => {
    const root = document.getElementById('mount');
    root.textContent = '';
    const st = memoryStorage();
    saveState(st, setupState());
    let t = new Date(2026, 10, 3, 9, 0).getTime();
    const app = createApp({ root, storage: st, now: () => new Date(t), useHash: false, win: window });
    app.installed = true;
    app.render();
    app.go('#/log/strength/A');
    click(root, 'Start Session A');
    const dock = () => root.querySelector('.dock');
    const title = () => dock().querySelector('.dock-title').textContent;
    click(dock(), 'Start warm-up');
    t += 50 * 1000;
    app.render();
    expect(title()).toBe('Bodyweight squats');
    t += 10 * 60 * 1000;
    app.render();
    expect(app.state.draft.warmup.done).toBe(true);
    expect(title()).toBe('Reverse lunge');
    [...root.querySelectorAll('.tick')].forEach((b) => b.click());
    expect(title()).toBe('Every set done');
    click(dock(), 'Cool down');
    expect(title()).toBe('Hip-flexor stretch, left');
    expect(dock().textContent).toContain('Move 1 of 6 · Next: Hip-flexor stretch, right');
    t += 5 * 60 * 1000;
    app.render();
    expect(title()).toBe('Cooled down');
    expect(btn(dock(), 'Cool down')).toBe(undefined);
    click(dock(), 'Finish session');
    expect(root.querySelector('.sheet').textContent).toContain('Save session');
  });

  it('swapping for a two-legged version drops "per leg" and its left/right rows', () => {
    const { app, root } = mount(setupState(), '2026-11-06');
    app.go('#/log/strength/B');
    click(root, 'Start Session B');
    const menu = all(root).find((b) => (b.getAttribute('aria-label') || '').startsWith('More for Single-leg calf raise'));
    menu.click();
    all(root.querySelector('.sheet')).find((b) => b.textContent.startsWith('Double-leg slow calf raise')).click();
    const card = root.querySelector('section[aria-label="Double-leg slow calf raise"]');
    expect(card.querySelector('.rx').textContent.includes('per leg')).toBe(false);
    expect(card.textContent.includes('Left')).toBe(false);
    const calf = app.state.draft.exercises.find((e) => e.exerciseId === 'sl-calf-raise');
    expect(calf.rows.length).toBe(calf.target.sets);
  });

  it('rest settings change the rest times', () => {
    const { app, root } = mount(setupState(), '2026-11-03');
    app.go('#/log/strength/A');
    click(root, 'Start Session A');
    click(root, 'Rest settings');
    expect(root.querySelector('.sheet').textContent.includes('One exercise at a time')).toBe(false);
    click(root, '30 s');
    click(root, '90 s');
    click(root.querySelector('.sheet'), 'Done');
    expect(app.state.settings.restShort).toBe(30);
    expect(app.state.settings.restLong).toBe(90);
    const dock = () => root.querySelector('.dock');
    click(dock(), 'Skip');
    click(dock(), 'Done');
    click(dock(), 'Done');
    expect(app.state.draft.rest.total).toBe(30);
    expect(dock().textContent).toContain('Next: Press-up · Set 1 of 3');
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
    addCheckin(s, '2026-11-02');
    const { app, root } = mount(s, '2026-11-04');
    app.go('#/log');
    expect(root.textContent.includes('Run')).toBe(false);
    all(root, '.list-item').find((b) => b.textContent.includes('Check-in')).click();
    click(root, 'Delete');
    expect(app.state.checkins.length).toBe(0);
    click(root.querySelector('.toast'), 'Undo');
    expect(app.state.checkins.length).toBe(1);
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

  it('plan view changes the training days', () => {
    const { app, root } = mount(setupState());
    app.go('#/plan');
    expect(root.textContent).toContain('Session A · about');
    click(root, 'Change training days');
    click(root, 'Session B on Wednesday');
    expect(root.textContent).toContain('back-to-back');
    click(root, 'Save');
    expect(app.state.schedule.strengthDays).toEqual({ tue: 'A', wed: 'B' });
  });
  it('progress renders with and without data', () => {
    const { app, root } = mount(setupState());
    app.go('#/progress');
    expect(root.textContent).toContain('Consistency');
    expect(root.textContent).toContain('Log a session to see each exercise here.');
    expect(/(pace|km|running|runs)/i.test(root.textContent)).toBe(false);
    const m = mount(ready());
    m.app.go('#/progress');
    expect(m.root.querySelectorAll('svg.chart').length).toBe(2);
  });
  it('restore replaces the state', () => {
    const { app } = mount(setupState());
    const other = emptyState(new Date(2026, 0, 1));
    const r = app.restore(makeBackup(other, new Date(2026, 0, 1)).json);
    expect(r.ok).toBe(true);
    expect(app.state.setupDone).toBe(false);
    expect(app.restore('nope').ok).toBe(false);
  });

  it('the block review cannot be dismissed, only acted on', () => {
    const { app, root } = mount(setupState(), '2027-01-01');
    app.go('#/coach');
    const card = [...root.querySelectorAll('.card')].find((c) => c.textContent.includes('Block 1 finished'));
    expect(btn(card, 'Got it')).toBe(undefined);
    btn(card, 'Review and plan the next block').click();
    expect(app.route.name).toBe('block');
    expect(root.textContent).toContain('How each exercise went');
    click(root, 'Start block 2');
    expect(app.state.block.number).toBe(2);
    expect(app.state.plans.length).toBe(1);
  });

  it('block review: switch a change off, start, then undo', () => {
    const s = setupState();
    for (let w = 0; w < 8; w++) {
      const mon = addDays('2026-11-02', 7 * w);
      addLog(s, 'A', addDays(mon, 1));
      addLog(s, 'B', addDays(mon, 3));
    }
    const { app, root } = mount(s, '2027-01-01');
    expect(root.textContent).toContain('Block 1 finished');
    click(root, 'Review the block');
    expect(root.textContent).toContain('Changes for block 2');
    expect(btn(root, 'Start block 2 with 6 changes')).toBeTruthy(); // 2 fixes and 1 fresh exercise per session
    click(root, 'Keep: Reverse lunge: a fresh challenge');
    click(root, 'Start block 2 with 5 changes');
    expect(app.state.block.number).toBe(2);
    expect(app.state.plans.length).toBe(2);
    expect(currentPlan(app.state).sessions.A.exercises[0].tempoDown).toBe(2);
    expect(currentPlan(app.state).sessions.A.exercises[1].tempoDown).toBe(3);
    click(root.querySelector('.toast'), 'Undo');
    expect(app.state.block.number).toBe(1);
    expect(app.state.plans.length).toBe(1);
  });
  it('erase and restore can be undone', () => {
    const s = setupState();
    addLog(s, 'A', '2026-11-03');
    const { app } = mount(s);
    app.replaceState(emptyState(new Date(2026, 10, 20)));
    expect(app.state.setupDone).toBe(false);
    expect(app.undoReplace()).toBe(true);
    expect(app.state.strengthLogs.length).toBe(1);
  });
  it('a benchmark saves the strength tests', () => {
    const { app, root } = mount(setupState(), '2026-11-30');
    app.go('#/log/benchmark');
    expect(root.textContent.includes('10K')).toBe(false);
    type(root.querySelector('[aria-label="Press-ups"]'), '24');
    click(root, 'Save benchmark');
    expect(app.state.benchmarks[1].pressUps).toBe(24);
  });
  it('unreadable saved data shows the recovery screen', () => {
    const root = document.getElementById('mount');
    const st = memoryStorage();
    st.setItem('src-state', 'broken');
    createApp({ root, storage: st, useHash: false, win: window });
    expect(root.textContent).toContain('Saved data could not be read');
  });
});

describe('ui: circuit editor', () => {
  it('adds, moves and removes exercises, saves one plan version, and Undo takes it back', () => {
    const { app, root } = mount(setupState(), '2026-11-10');
    app.go('#/plan');
    click(root, 'Edit Session B');
    expect(app.route.name).toBe('circuit');
    expect(root.querySelector('.tabbar')).toBe(null);
    expect(root.textContent).toContain('No upper back work in this session.');
    click(root, '+ Add an exercise');
    const sheet = () => root.querySelector('.sheet');
    click(sheet(), 'Back');
    expect(sheet().textContent).toContain('In Session A.');
    click(sheet(), 'Add Prone Y–T–W raises');
    expect(root.querySelector('.sheet')).toBe(null);
    expect(root.textContent).toContain('Covers legs, push, upper back and core.');
    click(root, 'Move Prone Y–T–W raises up');
    click(root, 'Remove Single-leg calf raise');
    click(root, '50 min');
    expect(currentPlan(app.state).version).toBe(1); // nothing saved until Save
    click(root, 'Save changes');
    const plan = currentPlan(app.state);
    expect(plan.version).toBe(2);
    expect(plan.reason).toBe('You edited Session B: added Prone Y–T–W raises; removed Single-leg calf raise; target 50 min');
    expect(plan.sessions.B.exercises.map((p) => p.exerciseId)).toEqual(['sl-rdl', 'tempo-squat', 'pike-push-up', 'prone-ytw', 'side-plank']);
    expect(plan.sessions.B.targetMin).toBe(50);
    expect(plan.sessions.A).toEqual(currentPlan({ plans: [app.state.plans[0]] }).sessions.A);
    expect(app.route.name).toBe('plan');
    expect(root.textContent).toContain('Session B · about');
    click(root, 'Undo');
    expect(currentPlan(app.state).version).toBe(1);
  });

  it('creates your own exercise, refuses a banned one, and logs it in the next workout', () => {
    const { app, root } = mount(setupState(), '2026-11-10');
    app.go('#/plan');
    click(root, 'Edit Session A');
    click(root, '+ Add an exercise');
    const sheet = () => root.querySelector('.sheet');
    click(sheet(), 'Your own');
    click(sheet(), 'Create your own exercise');
    const name = sheet().querySelector('input[aria-label="Exercise name"]');
    type(name, 'Burpees');
    click(sheet(), 'Add');
    expect(sheet().textContent).toContain('Your brief rules out burpees and mountain climbers.');
    type(name, 'Single-leg balance');
    click(sheet(), 'Seconds');
    click(sheet(), 'Left and right');
    click(sheet(), 'Legs');
    click(sheet(), 'Add');
    expect(app.state.customExercises.length).toBe(1);
    expect(app.state.customExercises[0]).toEqual({ id: app.state.customExercises[0].id, name: 'Single-leg balance', unit: 'seconds', sides: true, area: 'legs', sets: 3, min: 20, max: 30 });
    expect(root.textContent).toContain('Single-leg balance');
    click(root, 'Save changes');
    const p = currentPlan(app.state).sessions.A.exercises[5];
    expect(p.variation).toBe('Single-leg balance');
    expect(p.unit).toBe('seconds');
    expect(p.sides).toEqual(['L', 'R']);
    app.go('#/log/strength/A');
    click(root, 'Start Session A');
    const e = app.state.draft.exercises[5];
    expect(e.rows.length).toBe(6);
    const card = root.querySelector('section[aria-label="Single-leg balance"]');
    expect(card.querySelector('.howto')).toBe(null);
  });

  it('Cancel with changes asks first; the plan is untouched', async () => {
    const { app, root } = mount(setupState(), '2026-11-10');
    app.go('#/plan/edit/A');
    click(root, 'Remove Dead bug');
    click(root, 'Back');
    await tick();
    expect(root.querySelector('.sheet').textContent).toContain('Discard your changes?');
    click(root.querySelector('.sheet'), 'Discard');
    await tick();
    expect(app.route.name).toBe('plan');
    expect(currentPlan(app.state).version).toBe(1);
    expect(app.circuitEdit).toBe(null);
  });
});
