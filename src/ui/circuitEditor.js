// Edit a circuit: add, remove and reorder exercises, change their numbers, and set the session's time target.
// Edits stay on this screen until Save, which makes one new plan version (with Undo). A workout already in
// progress keeps the exercises it started with.
import { h, fill, topbar, chips, stepper, field, group } from './dom.js';
import { openSheet, confirmSheet } from './sheet.js';
import { openRxEditor } from './coach.js';
import { AREAS, allExercises, useExercises } from '../library.js';
import {
  currentPlan, prescriptionLabel, tempoLabel, startingPrescription, withSession, TARGET_CHOICES,
} from '../plan.js';
import { balanceGaps, timeCheck, ownExerciseProblem, editSummary, sessionChanged } from '../circuit.js';
import { newId } from '../store.js';

const SHORT = { legs: 'Legs', push: 'Push', back: 'Back', core: 'Core' };

const copy = (session) => ({ ...session, exercises: session.exercises.map((p) => ({ ...p })) });

// The edit in progress lives on the app between redraws, and is dropped if the plan changes underneath it.
function editing(app, sessionId) {
  const plan = currentPlan(app.state);
  const e = app.circuitEdit;
  if (!e || e.sessionId !== sessionId || e.version !== plan.version) {
    app.circuitEdit = { sessionId, version: plan.version, session: copy(plan.sessions[sessionId]) };
  }
  return app.circuitEdit;
}

function startLabel(ex) {
  const s = ex.start;
  const range = s.min === s.max ? `${s.min}` : `${s.min}–${s.max}`;
  return `${s.sets} × ${range}${ex.unit === 'seconds' ? ' s' : ''}`;
}

function undoSave(app, version) {
  app.update((x) => {
    const last = x.plans[x.plans.length - 1];
    return last && last.version === version && x.plans.length > 1 ? { ...x, plans: x.plans.slice(0, -1) } : x;
  }, 'Edit undone');
}

export function circuitEditorView(app) {
  const { sessionId } = app.route;
  const plan = currentPlan(app.state);
  if (!plan.sessions[sessionId]) {
    return h('div', null, topbar('Edit circuit', { back: () => app.go('#/plan') }),
      h('div', { class: 'content' }, h('p', null, 'That session is not in your plan.')));
  }
  const ed = editing(app, sessionId);
  const s = ed.session;
  const before = plan.sessions[sessionId];
  const changed = sessionChanged(before, s);
  const redraw = () => app.render();
  const leave = () => { app.circuitEdit = null; app.go('#/plan'); };
  const cancel = async () => {
    if (changed && !(await confirmSheet(app, {
      title: 'Discard your changes?', text: `Session ${sessionId} stays as it was.`, confirmLabel: 'Discard', danger: true,
    }))) return;
    leave();
  };
  const save = () => {
    if (!changed) { leave(); return; }
    const reason = `You edited Session ${sessionId}: ${editSummary(before, s)}`;
    const today = app.today();
    let version = null;
    app.save((x) => {
      const next = withSession(currentPlan(x), sessionId, s, { today, reason });
      version = next.version;
      return { ...x, plans: [...x.plans, next] };
    });
    leave();
    app.toast(`Session ${sessionId} saved`, { action: { label: 'Undo', run: () => undoSave(app, version) }, ms: 6000 });
  };
  const addId = (id) => {
    if (!s.exercises.some((p) => p.exerciseId === id)) s.exercises.push(startingPrescription(id, app.today()));
    redraw();
  };
  const move = (i, d) => {
    const list = s.exercises;
    [list[i], list[i + d]] = [list[i + d], list[i]];
    redraw();
  };
  const remove = (i) => { s.exercises.splice(i, 1); redraw(); };
  const change = (i) => openRxEditor(app, {
    title: `Change ${s.exercises[i].variation}`, p: s.exercises[i], saveLabel: 'Done',
    onSave: (to) => { s.exercises[i] = to; redraw(); },
  });

  const t = timeCheck(s);
  const gaps = balanceGaps(plan, sessionId, s);
  const d = app.state.draft;
  const inProgress = d && d.sessionId === sessionId && !d.editingId;
  const last = s.exercises.length - 1;

  return h('div', null,
    topbar(`Edit Session ${sessionId}`, {
      sub: 'Changes start from your next workout',
      back: cancel,
      right: h('button', { class: 'btn small primary', type: 'button', onclick: save }, 'Save'),
    }),
    h('div', { class: 'content' },
      inProgress ? h('div', { class: 'banner info' }, `Your Session ${sessionId} in progress keeps the exercises it started with.`) : null,
      h('div', { class: 'card' },
        h('div', { class: 'row between' }, h('b', null, `About ${t.minutes} min`), h('span', { class: 'small muted' }, `target ${t.target} min`)),
        t.over ? h('p', { class: 'small warn-text', role: 'status' }, `Over your ${t.target}-minute target. Remove an exercise or a set, or raise the target.`) : null,
        group('Time target', chips({
          options: TARGET_CHOICES.map((n) => ({ value: n, label: `${n} min` })), value: t.target, label: 'Time target',
          onChange: (v) => { if (v) { s.targetMin = v; redraw(); } },
        }))),
      gaps.map((g) => h('div', { class: 'banner warn balance' },
        h('div', null, g.text),
        g.ideas.length ? h('div', { class: 'btn-row' }, g.ideas.map((ex) => h('button', {
          class: 'btn small', type: 'button', onclick: () => addId(ex.id),
        }, `Add ${ex.name}`))) : null)),
      gaps.length ? null : h('p', { class: 'small muted', style: { margin: '0 4px 10px' } }, 'Covers legs, push, upper back and core.'),
      h('div', { class: 'section-title' }, 'The circuit, in order'),
      h('div', { class: 'list' }, s.exercises.map((p, i) => h('div', { class: 'list-item edit-row' },
        h('span', { class: 'edit-num', 'aria-hidden': 'true' }, String(i + 1)),
        h('span', { class: 'grow' },
          h('b', null, p.variation),
          h('div', { class: 'small muted' }, [prescriptionLabel(p), tempoLabel(p)].filter(Boolean).join(' · ')),
          h('div', { class: 'edit-actions' },
            h('button', { class: 'btn small', type: 'button', disabled: i === 0, 'aria-label': `Move ${p.variation} up`, onclick: () => move(i, -1) }, '↑'),
            h('button', { class: 'btn small', type: 'button', disabled: i === last, 'aria-label': `Move ${p.variation} down`, onclick: () => move(i, 1) }, '↓'),
            h('button', { class: 'btn small', type: 'button', 'aria-label': `Change ${p.variation}`, onclick: () => change(i) }, 'Change'),
            h('button', { class: 'btn small', type: 'button', disabled: last === 0, 'aria-label': `Remove ${p.variation}`, onclick: () => remove(i) }, 'Remove')))))),
      h('button', { class: 'btn block', type: 'button', onclick: () => addSheet(app, plan, sessionId, s, addId) }, '+ Add an exercise'),
      h('div', { style: { height: '10px' } }),
      h('button', { class: 'btn primary block', type: 'button', onclick: save }, changed ? 'Save changes' : 'Done')));
}

function addSheet(app, plan, sessionId, s, addId) {
  const here = new Set(s.exercises.map((p) => p.exerciseId));
  const elsewhere = (id) => Object.entries(plan.sessions)
    .filter(([sid, ss]) => sid !== sessionId && ss.exercises.some((p) => p.exerciseId === id)).map(([sid]) => sid);
  const firstGap = balanceGaps(plan, sessionId, s)[0];
  let area = firstGap ? firstGap.area : 'legs';
  openSheet(app, 'Add an exercise', (close) => {
    const body = h('div');
    const draw = () => {
      const own = area === 'own';
      const list = allExercises().filter((ex) => (own ? ex.custom : !ex.custom && ex.area === area));
      fill(body,
        chips({
          options: [...AREAS.map((a) => ({ value: a.id, label: SHORT[a.id] })), { value: 'own', label: 'Your own' }],
          value: area, label: 'Area', onChange: (v) => { if (v) { area = v; draw(); } },
        }),
        h('div', { class: 'list', style: { marginTop: '12px' } }, list.map((ex) => {
          const inHere = here.has(ex.id);
          const other = elsewhere(ex.id);
          const note = inHere ? 'Already in this session.' : `${ex.note}${other.length ? ` In Session ${other.join(' and ')}.` : ''}`;
          return h('button', {
            class: 'list-item', type: 'button', disabled: inHere, 'aria-label': `Add ${ex.name}`,
            onclick: () => { close(); addId(ex.id); },
          },
          h('span', { class: 'grow' }, h('b', null, ex.name), h('div', { class: 'small muted' }, note)),
          h('span', { class: 'small muted nowrap' }, startLabel(ex)));
        })),
        own && !list.length ? h('p', { class: 'small muted' }, 'None yet. Make one below.') : null,
        own ? h('button', { class: 'btn primary block', type: 'button', onclick: () => { close(); ownSheet(app, addId); } }, 'Create your own exercise') : null);
    };
    draw();
    return body;
  });
}

function ownSheet(app, addId) {
  const f = { name: '', unit: 'reps', sides: false, area: 'core', sets: 3, min: 8, max: 12 };
  openSheet(app, 'Your own exercise', (close) => {
    const body = h('div');
    const err = h('p', { class: 'small warn-text', role: 'alert' });
    const name = h('input', {
      type: 'text', value: f.name, maxlength: '40', placeholder: 'For example: Wide press-up', autocomplete: 'off',
      'aria-label': 'Exercise name', oninput: (e) => { f.name = e.target.value; },
    });
    const draw = () => {
      const isSec = f.unit === 'seconds';
      const unit = isSec ? ' (s)' : '';
      fill(body,
        field('Name', name),
        group('Counted in', chips({
          options: [{ value: 'reps', label: 'Reps' }, { value: 'seconds', label: 'Seconds' }], value: f.unit, label: 'Counted in',
          onChange: (v) => {
            if (!v || v === f.unit) return;
            f.unit = v;
            Object.assign(f, v === 'seconds' ? { min: 20, max: 30 } : { min: 8, max: 12 });
            draw();
          },
        })),
        group('Sides', chips({
          options: [{ value: 'both', label: 'Both at once' }, { value: 'each', label: 'Left and right' }],
          value: f.sides ? 'each' : 'both', label: 'Sides', onChange: (v) => { if (v) { f.sides = v === 'each'; draw(); } },
        })),
        group('Works', chips({
          options: AREAS.map((a) => ({ value: a.id, label: SHORT[a.id] })), value: f.area, label: 'Works',
          onChange: (v) => { if (v) { f.area = v; draw(); } },
        })),
        h('div', { class: 'grid3' },
          h('div', { class: 'field' }, h('span', { class: 'label' }, 'Sets'), stepper({ value: f.sets, min: 1, max: 5, label: 'Sets', onChange: (v) => { f.sets = v; } })),
          h('div', { class: 'field' }, h('span', { class: 'label' }, `From${unit}`), stepper({ value: f.min, min: 1, max: 300, step: isSec ? 5 : 1, label: 'Bottom of range', onChange: (v) => { f.min = v; } })),
          h('div', { class: 'field' }, h('span', { class: 'label' }, `To${unit}`), stepper({ value: f.max, min: 1, max: 300, step: isSec ? 5 : 1, label: 'Top of range', onChange: (v) => { f.max = v; } }))),
        h('p', { class: 'small muted' }, `The Coach adds ${isSec ? '5 s' : 'a rep'} at a time as you get stronger, then an extra set. Your own exercises have no how-to steps or harder versions.`),
        err,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
          h('button', {
            class: 'btn primary', type: 'button',
            onclick: () => {
              const problem = ownExerciseProblem(f, app.state.customExercises || []);
              if (problem) { err.textContent = problem; return; }
              const def = { id: newId('own'), name: f.name.trim(), unit: f.unit, sides: f.sides, area: f.area, sets: f.sets, min: f.min, max: f.max };
              app.save((x) => ({ ...x, customExercises: [...(x.customExercises || []), def] }));
              useExercises(app.state);
              close();
              addId(def.id);
            },
          }, 'Add')));
    };
    draw();
    return body;
  });
}
