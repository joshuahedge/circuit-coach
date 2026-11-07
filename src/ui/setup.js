// First run: run days and types, the brief's open baseline questions, optional body numbers, strength days.
import { h, fill, chips, field, group, numberInput, topbar } from './dom.js';
import { DAY_KEYS, DAY_NAMES, DAY_SHORT, weekStart } from '../dates.js';
import { recommendStrengthDays, scheduleWarnings } from '../schedule.js';
import { createInitialPlan } from '../plan.js';
import { tenKFrom } from './forms.js';
import { newId } from '../store.js';
import { SAFETY_NOTE } from '../library.js';

const RUN_CHOICES = [
  { value: 'easy', label: 'Easy' },
  { value: 'quality', label: 'Quality' },
  { value: 'long', label: 'Long' },
  { value: 'other', label: 'Other' },
];

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
    tenKSec: tenKFrom(b.tenKMin, b.tenKSec).value ?? null,
    notes: 'Starting baseline',
  };
  return {
    ...state,
    setupDone: true,
    profile: { ...state.profile, ...w.profile },
    conventions: { ...w.conventions },
    schedule: { runDays: { ...w.runDays }, strengthDays: { ...w.strengthDays } },
    block: { number: 1, startDate: weekStart(today) },
    plans: [plan],
    benchmarks: [baseline],
  };
}

export function setupView(app) {
  const w = app.setupDraft || (app.setupDraft = {
    step: 0,
    runDays: { mon: null, wed: null, sat: null },
    conventions: { lungeBaselinePerLeg: null, bridgeBaselinePerLeg: null },
    base: { pressUps: 20, squats: 20, lunges: 10, plankSec: 60, bridge: 5, tenKMin: 65, tenKSec: 0 },
    profile: { age: null, heightCm: null, weightKg: null },
    strengthDays: null,
    changeDays: false,
  });
  const root = h('div');
  const STEPS = 5;

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
          h('h1', null, 'Strength & Running Coach'),
          h('p', { class: 'muted' }, 'Two bodyweight strength sessions and three runs a week. Log them here, see your progress, and get suggested plan changes you approve.')),
        h('div', { class: 'card' },
          h('h2', null, 'A few questions first'),
          h('p', null, 'Which runs you do on which days, how your starting numbers were counted, and which days suit strength. About two minutes.')),
        h('p', { class: 'small muted' }, SAFETY_NOTE),
        h('p', { class: 'small muted' }, 'Everything stays on this phone. Back it up from the Plan tab.'),
        h('button', { class: 'btn primary block', type: 'button', onclick: () => goStep(1) }, 'Start')),
    ];
  }

  function runs() {
    const days = DAY_KEYS.filter((d) => d in w.runDays);
    const valid = days.length > 0 && days.every((d) => w.runDays[d]);
    const longs = days.filter((d) => w.runDays[d] === 'long').length;
    const toggleDay = (d) => {
      if (d in w.runDays) delete w.runDays[d];
      else w.runDays[d] = null;
      w.strengthDays = null;
      redraw();
    };
    return [
      topbar('Your runs', { sub: 'Step 1 of 4' }),
      h('div', { class: 'content' },
        progress(),
        group('Which days do you run?',
          h('div', { class: 'day-pick' }, DAY_KEYS.map((d) => h('button', {
            type: 'button', class: 'chip', 'aria-pressed': String(d in w.runDays), 'aria-label': DAY_NAMES[d], onclick: () => toggleDay(d),
          }, DAY_SHORT[d])))),
        h('div', { class: 'card' },
          h('h2', null, 'What kind of run is each one?'),
          h('p', { class: 'small muted' }, 'Quality means the hard one: tempo or intervals. The coach protects your long and quality runs.'),
          days.map((d) => h('div', { class: 'runday' },
            h('div', { class: 'name' }, DAY_NAMES[d]),
            chips({ options: RUN_CHOICES, value: w.runDays[d], label: `${DAY_NAMES[d]} run type`, onChange: (v) => { w.runDays[d] = v; w.strengthDays = null; redraw(); } }))),
          days.length === 0 ? h('p', { class: 'muted' }, 'Pick your run days above.') : null),
        longs > 1 ? h('div', { class: 'banner warn' }, 'More than one long run a week is unusual. Fine if intended.') : null,
        nav(valid)),
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
      topbar('Starting numbers', { sub: 'Step 2 of 4' }),
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
            field('SL glute bridge', numberInput({ value: b.bridge, onInput: (n) => { b.bridge = n; } }))),
          group('10K time', h('div', { class: 'grid2' },
            numberInput({ value: b.tenKMin, unit: 'min', label: '10K minutes', onInput: (n) => { b.tenKMin = n; } }),
            numberInput({ value: b.tenKSec, unit: 's', label: '10K seconds', max: 59, onInput: (n) => { b.tenKSec = n; } })))),
        nav(valid)),
    ];
  }

  function about() {
    const p = w.profile;
    return [
      topbar('About you', { sub: 'Step 3 of 4 · optional' }),
      h('div', { class: 'content' },
        progress(),
        h('div', { class: 'card' },
          h('p', { class: 'small muted' }, 'Optional. Stays on this phone and only appears in your own summary.'),
          h('div', { class: 'grid3' },
            field('Age', numberInput({ value: p.age, onInput: (n) => { p.age = Number.isFinite(n) ? n : null; } })),
            field('Height', numberInput({ value: p.heightCm, unit: 'cm', onInput: (n) => { p.heightCm = Number.isFinite(n) ? n : null; } })),
            field('Weight', numberInput({ value: p.weightKg, unit: 'kg', decimal: true, onInput: (n) => { p.weightKg = Number.isFinite(n) ? n : null; } })))),
        nav(true, 'Next')),
    ];
  }

  function strengthDays() {
    const rec = recommendStrengthDays(w.runDays);
    if (!w.strengthDays) w.strengthDays = { ...rec.strengthDays };
    const dayOf = (id) => Object.keys(w.strengthDays).find((d) => w.strengthDays[d] === id);
    const setDay = (id, d) => {
      const other = id === 'A' ? 'B' : 'A';
      const next = { [d]: id };
      const od = dayOf(other);
      if (od && od !== d) next[od] = other;
      w.strengthDays = next;
      redraw();
    };
    const warnings = scheduleWarnings({ runDays: w.runDays, strengthDays: w.strengthDays });
    const isRec = JSON.stringify(Object.entries(w.strengthDays).sort()) === JSON.stringify(Object.entries(rec.strengthDays).sort());
    const valid = Boolean(dayOf('A') && dayOf('B'));
    const finish = () => {
      const today = app.today();
      app.setupDraft = null;
      app.update((s) => buildSetupState(s, w, today), "You're set up. Here's your week.");
      app.go('#/week');
    };
    return [
      topbar('Strength days', { sub: 'Step 4 of 4' }),
      h('div', { class: 'content' },
        progress(),
        h('div', { class: 'card accent-strength' },
          h('h2', null, isRec ? 'Recommended' : 'Your choice'),
          ['A', 'B'].map((id) => h('p', { class: 'strong' }, `${DAY_NAMES[dayOf(id)] || '–'}: Session ${id}`)),
          isRec ? h('ul', { class: 'small muted' }, rec.reasons.map((r) => h('li', null, r))) : null),
        warnings.map((x) => h('div', { class: `banner ${x.level === 'warn' ? 'warn' : 'run'}` }, x.text)),
        w.changeDays
          ? h('div', { class: 'card' },
            ['A', 'B'].map((id) => group(`Session ${id}`, h('div', { class: 'day-pick' }, DAY_KEYS.map((d) => h('button', {
              type: 'button', class: 'chip', 'aria-pressed': String(dayOf(id) === d), 'aria-label': `Session ${id} on ${DAY_NAMES[d]}`,
              onclick: () => setDay(id, d),
            }, DAY_SHORT[d]))))),
            !isRec ? h('button', { class: 'link', type: 'button', onclick: () => { w.strengthDays = { ...rec.strengthDays }; redraw(); } }, 'Use the recommendation') : null)
          : h('button', { class: 'link', type: 'button', onclick: () => { w.changeDays = true; redraw(); } }, 'Choose other days'),
        h('p', { class: 'small muted' }, 'You can change the schedule any time from the Plan tab.'),
        nav(valid, 'Finish', finish)),
    ];
  }

  function draw() {
    return [welcome, runs, baselines, about, strengthDays][w.step]();
  }
  redraw();
  return root;
}
