// First run: training days, the brief's open baseline questions, optional body numbers.
import { h, fill, chips, field, group, numberInput, topbar } from './dom.js';
import { weekStart } from '../dates.js';
import { DEFAULT_DAYS, scheduleWarnings } from '../schedule.js';
import { dayOf, sessionDayPickers, withSessionDay } from './days.js';
import { createInitialPlan } from '../plan.js';
import { pickBackupFile } from './plan.js';
import { newId } from '../store.js';
import { SAFETY_NOTE } from '../library.js';

export function buildSetupState(state, w, today) {
  const plan = createInitialPlan(today);
  const notes = [];
  const A = plan.sessions.A.exercises;
  if (w.conventions.lungeBaselinePerLeg === false) {
    const p = A.find((x) => x.exerciseId === 'reverse-lunge');
    p.min = 6; p.max = 8;
    notes.push('Lunges start at 6–8 per leg because your 10 was a total.');
  }
  if (w.conventions.bridgeBaselinePerLeg === false) {
    const p = A.find((x) => x.exerciseId === 'sl-glute-bridge');
    p.min = 3; p.max = 5;
    notes.push('Single-leg bridges start at 3–5 per leg because your 5 was a total.');
  }
  if (notes.length) plan.reason = `Starting plan from the brief, adjusted for your baselines. ${notes.join(' ')}`;
  const perLeg = (n, perLegFlag) => (n === null || n === undefined || Number.isNaN(n) ? null : perLegFlag === false ? Math.round(n / 2) : n);
  const b = w.base;
  const baseline = {
    id: newId('bench'),
    date: today,
    pressUps: Number.isFinite(b.pressUps) ? b.pressUps : null,
    plankSec: Number.isFinite(b.plankSec) ? b.plankSec : null,
    bridgeLeft: perLeg(b.bridge, w.conventions.bridgeBaselinePerLeg),
    bridgeRight: perLeg(b.bridge, w.conventions.bridgeBaselinePerLeg),
    squats: Number.isFinite(b.squats) ? b.squats : null,
    lunges: perLeg(b.lunges, w.conventions.lungeBaselinePerLeg),
    notes: 'Starting baseline',
  };
  return {
    ...state,
    setupDone: true,
    profile: { ...state.profile, ...w.profile },
    conventions: { ...w.conventions },
    schedule: { strengthDays: { ...w.strengthDays } },
    block: { number: 1, startDate: weekStart(today) },
    plans: [plan],
    benchmarks: [baseline],
  };
}

export function setupView(app) {
  const w = app.setupDraft || (app.setupDraft = {
    step: 0,
    strengthDays: { ...DEFAULT_DAYS },
    conventions: { lungeBaselinePerLeg: null, bridgeBaselinePerLeg: null },
    base: { pressUps: 20, squats: 20, lunges: 10, plankSec: 60, bridge: 5 },
    profile: { age: null, heightCm: null, weightKg: null },
  });
  const root = h('div');
  const STEPS = 4;

  const redraw = () => { fill(root, draw()); };
  const goStep = (n) => { w.step = n; redraw(); if (app.win.scrollTo) app.win.scrollTo(0, 0); };
  const progress = () => h('div', { class: 'steps', 'aria-hidden': 'true' },
    Array.from({ length: STEPS }, (_, i) => h('i', { class: i <= w.step ? 'on' : '' })));
  const nav = (canNext, nextLabel = 'Next', onNext = () => goStep(w.step + 1)) => h('div', { class: 'btn-row' },
    w.step > 0 ? h('button', { class: 'btn', type: 'button', onclick: () => goStep(w.step - 1) }, 'Back') : null,
    h('button', { class: 'btn primary', type: 'button', disabled: !canNext, onclick: onNext }, nextLabel));

  function welcome() {
    return [
      h('div', { class: 'content' },
        h('div', { class: 'setup-hero' },
          h('h1', null, 'Circuit Coach'),
          h('p', { class: 'muted' }, 'Two bodyweight circuit sessions a week. The app runs each session with timers, tracks your progress, and suggests plan changes you approve.')),
        h('div', { class: 'card' },
          h('h2', null, 'A few questions first'),
          h('p', null, 'Which days you train and how your starting numbers were counted. About a minute.')),
        h('p', { class: 'small muted' }, SAFETY_NOTE),
        h('p', { class: 'small muted' }, 'Everything stays on this phone. Back it up from the Plan tab.'),
        h('button', { class: 'btn primary block', type: 'button', onclick: () => goStep(1) }, 'Start'),
        h('button', { class: 'btn ghost block', type: 'button', style: { marginTop: '8px' }, onclick: () => pickBackupFile(app) }, 'Restore from a backup file')),
    ];
  }

  function baselines() {
    const c = w.conventions;
    const b = w.base;
    const valid = c.lungeBaselinePerLeg !== null && c.bridgeBaselinePerLeg !== null;
    const yesNo = (key, a, bLabel) => chips({
      options: [{ value: true, label: a }, { value: false, label: bLabel }], value: c[key],
      onChange: (v) => { c[key] = v; redraw(); },
    });
    return [
      topbar('Starting numbers', { sub: 'Step 2 of 3' }),
      h('div', { class: 'content' },
        progress(),
        h('div', { class: 'card' },
          group(`Your ${b.lunges ?? 10} reverse lunges were…`, yesNo('lungeBaselinePerLeg', 'Per leg', 'In total')),
          group(`Your ${b.bridge ?? 5} single-leg glute bridges were…`, yesNo('bridgeBaselinePerLeg', 'Per leg', 'In total'),
            'If they were totals, those exercises start a little lower.')),
        h('div', { class: 'card' },
          h('h2', null, 'Baseline tests'),
          h('p', { class: 'small muted' }, 'From your brief. Change any that are off. These become your first benchmark.'),
          h('div', { class: 'grid2' },
            field('Press-ups', numberInput({ value: b.pressUps, onInput: (n) => { b.pressUps = n; } })),
            field('Squats', numberInput({ value: b.squats, onInput: (n) => { b.squats = n; } })),
            field('Reverse lunges', numberInput({ value: b.lunges, onInput: (n) => { b.lunges = n; } })),
            field('Plank', numberInput({ value: b.plankSec, unit: 's', onInput: (n) => { b.plankSec = n; } })),
            field('SL glute bridge', numberInput({ value: b.bridge, onInput: (n) => { b.bridge = n; } })))),
        nav(valid)),
    ];
  }

  function about() {
    const p = w.profile;
    return [
      topbar('About you', { sub: 'Step 3 of 3 · optional' }),
      h('div', { class: 'content' },
        progress(),
        h('div', { class: 'card' },
          h('p', { class: 'small muted' }, 'Optional. Stays on this phone and only appears in your own summary.'),
          h('div', { class: 'grid3' },
            field('Age', numberInput({ value: p.age, onInput: (n) => { p.age = Number.isFinite(n) ? n : null; } })),
            field('Height', numberInput({ value: p.heightCm, unit: 'cm', onInput: (n) => { p.heightCm = Number.isFinite(n) ? n : null; } })),
            field('Weight', numberInput({ value: p.weightKg, unit: 'kg', decimal: true, onInput: (n) => { p.weightKg = Number.isFinite(n) ? n : null; } })))),
        nav(true, 'Finish', finish)),
    ];
  }

  function trainingDays() {
    const pick = (id, d) => { w.strengthDays = withSessionDay(w.strengthDays, id, d); redraw(); };
    const warnings = scheduleWarnings({ strengthDays: w.strengthDays });
    const valid = Boolean(dayOf(w.strengthDays, 'A') && dayOf(w.strengthDays, 'B'));
    return [
      topbar('Your training days', { sub: 'Step 1 of 3' }),
      h('div', { class: 'content' },
        progress(),
        h('div', { class: 'card accent-strength' },
          h('h2', null, 'Two sessions a week'),
          h('p', { class: 'small muted' }, 'Pick a day for each. Two or three days between them suits recovery; you can move them any time from the Plan tab.'),
          sessionDayPickers(w.strengthDays, pick)),
        warnings.map((x) => h('div', { class: 'banner warn' }, x.text)),
        nav(valid)),
    ];
  }

  function finish() {
    const today = app.today();
    app.setupDraft = null;
    app.update((st) => buildSetupState(st, w, today), "You're set up. Here's your week.");
    app.go('#/week');
  }

  function draw() {
    return [welcome, trainingDays, baselines, about][w.step]();
  }
  redraw();
  return root;
}
