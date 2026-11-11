// Coach: suggestions with Accept / Edit / Reject, notes, block review, plan history, summary for Claude.
import { h, fill, topbar, stepper, field } from './dom.js';
import { openSheet, confirmSheet } from './sheet.js';
import { coachReview, acceptSuggestion, rejectSuggestion, dismissNote, canUndoDecision, undoDecision, exerciseStanding } from '../coach.js';
import { currentPlan, prescriptionLabel, revertPlan, tempoLabel, sidesFor } from '../plan.js';
import { exerciseById, EXERCISES } from '../library.js';
import { buildSummary } from '../summary.js';
import { formatShort } from '../dates.js';

export function rxText(p) {
  const t = tempoLabel(p);
  return `${p.variation} · ${prescriptionLabel(p)}${t ? ` · ${t}` : ''}`;
}

// Editor for one prescription. onSave(newPrescription) gets a full copy.
export function openRxEditor(app, { title, p, onSave, saveLabel = 'Save' }) {
  const ex = exerciseById(p.exerciseId);
  const d = { ...p };
  openSheet(app, title, (close) => {
    const body = h('div');
    const err = h('p', { class: 'small', style: { color: 'var(--bad)' }, role: 'alert' });
    const draw = () => {
      const isSec = d.unit === 'seconds';
      const unit = isSec ? ' s' : '';
      const variations = [...new Set([d.variation, ...ex.ladder.map((l) => l.name), ...ex.swaps.map((s) => s.name)])];
      const select = h('select', {
        'aria-label': 'Exercise version',
        onchange: (e) => {
          const name = e.target.value;
          const rung = ex.ladder.find((l) => l.name === name);
          d.sides = sidesFor(ex.id, name, d);
          d.variation = name;
          if (rung) { d.min = rung.min; d.max = rung.max; }
          draw();
        },
      }, variations.map((v) => h('option', { value: v }, v)));
      select.value = d.variation;
      fill(body,
        field('Version', select, 'Harder versions are listed in order; swaps keep the same numbers.'),
        h('div', { class: 'grid2' },
          h('div', { class: 'field' }, h('span', { class: 'label' }, 'Sets'), stepper({ value: d.sets, min: 1, max: 6, label: 'Sets', onChange: (v) => { d.sets = v; } })),
          h('div', { class: 'field' }, h('span', { class: 'label' }, `Bottom of range${unit}`), stepper({ value: d.min, min: 1, max: 300, step: isSec ? 5 : 1, label: 'Bottom of range', onChange: (v) => { d.min = v; } })),
          h('div', { class: 'field' }, h('span', { class: 'label' }, `Top of range${unit}`), stepper({ value: d.max, min: 1, max: 300, step: isSec ? 5 : 1, label: 'Top of range', onChange: (v) => { d.max = v; } })),
          isSec ? null : h('div', { class: 'field' }, h('span', { class: 'label' }, 'Lowering (s)'), stepper({ value: d.tempoDown || 0, min: 0, max: 6, label: 'Lowering seconds', onChange: (v) => { d.tempoDown = v; } })),
          isSec ? null : h('div', { class: 'field' }, h('span', { class: 'label' }, 'Pause (s)'), stepper({ value: d.pause || 0, min: 0, max: 5, label: 'Pause seconds', onChange: (v) => { d.pause = v; } }))),
        err,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
          h('button', {
            class: 'btn primary', type: 'button',
            onclick: () => {
              if (d.min > d.max) { err.textContent = 'The bottom of the range must not be above the top.'; return; }
              close();
              onSave({ ...d });
            },
          }, saveLabel)));
    };
    draw();
    return body;
  });
}

const GHOST_MS = 8000;

// After Accept or Reject the card stays where it was for a few seconds as "Accepted · Undo", so the next
// card never slides under a finger mid-tap.
function decide(app, s, status, fn, message, cardEl = null) {
  app.coachGhosts = app.coachGhosts || new Map();
  // Keep the card's height so nothing below it moves up under the finger.
  const height = cardEl && cardEl.isConnected ? cardEl.offsetHeight : null;
  app.coachGhosts.set(s.key, { s, status, until: Date.now() + GHOST_MS, height });
  app.update(fn);
  const undo = () => {
    app.coachGhosts.delete(s.key);
    app.update((x) => undoDecision(x, s.key), 'Undone');
  };
  app.toast(message, canUndoDecision(app.state, s.key) ? { action: { label: 'Undo', run: undo }, ms: GHOST_MS } : undefined);
}

function ghostCard(app, g) {
  const can = canUndoDecision(app.state, g.s.key);
  return h('div', { class: 'card ghost', style: g.height ? { minHeight: `${g.height}px` } : null },
    h('div', { class: `kind ${g.status === 'rejected' ? 'reduce' : 'progress'}` }, g.status === 'rejected' ? 'Rejected' : g.status === 'edited' ? 'Accepted with your changes' : 'Accepted'),
    h('h3', null, g.s.title),
    can ? h('button', {
      class: 'btn small', type: 'button', 'aria-label': `Undo: ${g.s.title}`,
      onclick: () => { app.coachGhosts.delete(g.s.key); app.update((x) => undoDecision(x, g.s.key), 'Undone'); },
    }, 'Undo') : h('p', { class: 'tiny muted' }, 'To change it back, use Plan history below.'));
}

function suggestionCard(app, s) {
  const today = app.today();
  let card = null;
  const accept = () => decide(app, s, 'accepted', (x) => acceptSuggestion(x, s, today), `Plan updated: ${s.title}`, card);
  const reject = () => decide(app, s, 'rejected', (x) => rejectSuggestion(x, s, today), 'Kept your plan as it is', card);
  const edit = () => openRxEditor(app, {
    title: `Edit: ${s.exerciseName}`, p: s.to, saveLabel: 'Accept with changes',
    onSave: (p) => decide(app, s, 'edited', (x) => acceptSuggestion(x, s, today, p), 'Plan updated with your changes', card),
  });
  card = h('div', { class: 'card' },
    h('div', { class: `kind ${s.kind}` }, s.kind === 'progress' ? `Progress · Session ${s.sessionId}` : `Ease off · Session ${s.sessionId}`),
    h('h3', null, s.title),
    h('p', { class: 'small' }, s.reason),
    s.details && s.details.length ? h('div', { class: 'evidence' },
      h('div', { class: 'tiny muted strong' }, 'What the coach saw'),
      s.details.map((line) => h('div', { class: 'tiny num' }, line))) : null,
    h('div', { class: 'diff' },
      h('span', { class: 'from' }, `${prescriptionLabel(s.from)}${tempoLabel(s.from) ? ` · ${tempoLabel(s.from)}` : ''}`),
      h('span', { 'aria-hidden': 'true' }, '→'),
      h('span', { class: 'to' }, `${s.to.variation !== s.from.variation ? `${s.to.variation}: ` : ''}${prescriptionLabel(s.to)}${tempoLabel(s.to) ? ` · ${tempoLabel(s.to)}` : ''}`)),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', type: 'button', 'aria-label': `Accept: ${s.title}`, onclick: accept }, 'Accept'),
      h('button', { class: 'btn', type: 'button', 'aria-label': `Edit: ${s.title}`, onclick: edit }, 'Edit'),
      h('button', { class: 'btn', type: 'button', 'aria-label': `Reject: ${s.title}`, onclick: reject }, 'Reject')));
  return card;
}

// Suggestions in a stable order: decided ones keep their place (as ghosts) until they expire.
function suggestionList(app, suggestions) {
  const ghosts = app.coachGhosts || (app.coachGhosts = new Map());
  const nowMs = Date.now();
  for (const [k, g] of ghosts) {
    if (g.until <= nowMs || !app.state.decisions.some((d) => d.key === k)) ghosts.delete(k);
  }
  const current = new Map(suggestions.map((x) => [x.key, x]));
  const order = (app.coachOrder || []).filter((k) => current.has(k) || ghosts.has(k));
  for (const x of suggestions) if (!order.includes(x.key)) order.push(x.key);
  app.coachOrder = order;
  if (ghosts.size) {
    const next = Math.min(...[...ghosts.values()].map((g) => g.until));
    const timer = setTimeout(() => { if (app.route.name === 'coach') app.render(); }, Math.max(50, next - nowMs + 50));
    app.onLeave(() => clearTimeout(timer));
  }
  return order.map((k) => (current.has(k) ? suggestionCard(app, current.get(k)) : ghostCard(app, ghosts.get(k))));
}

function noteCard(app, n) {
  const today = app.today();
  const actions = [];
  if (n.action === 'benchmark') actions.push(h('button', { class: 'btn primary', type: 'button', onclick: () => app.go('#/log/benchmark') }, 'Log tests'));
  if (n.action === 'start-block') {
    actions.push(h('button', { class: 'btn primary', type: 'button', onclick: () => app.go('#/coach/block') }, 'Review and plan the next block'));
  }
  // The block review stays until the next block starts: dismissing it would leave the coach in review.
  if (n.kind !== 'block') actions.push(h('button', { class: 'btn', type: 'button', onclick: () => app.update((x) => dismissNote(x, n, today)) }, 'Got it'));
  return h('div', { class: `card ${n.level === 'warn' ? 'warn' : 'info'}` },
    h('h3', null, n.title),
    h('p', { class: 'small' }, n.text),
    h('div', { class: 'btn-row' }, actions));
}

export async function copySummary(app) {
  const text = buildSummary(app.state, app.today());
  const clip = app.win.navigator && app.win.navigator.clipboard;
  try {
    if (!clip) throw new Error('no clipboard');
    await clip.writeText(text);
    app.toast('Summary copied. Paste it into a Claude chat.');
  } catch (e) {
    openSheet(app, 'Training summary', () => {
      const ta = h('textarea', { rows: '14', readonly: true }, text);
      setTimeout(() => { ta.focus(); ta.select(); }, 50);
      return h('div', null, h('p', { class: 'small muted' }, 'Select all and copy, then paste into a Claude chat.'), ta);
    });
  }
}

function history(app) {
  const plans = [...app.state.plans].reverse();
  const current = currentPlan(app.state);
  const revert = async (v) => {
    const ok = await confirmSheet(app, { title: `Go back to version ${v}?`, text: 'This makes a new version that copies it. Nothing is deleted, so you can switch back.', confirmLabel: 'Go back' });
    if (ok) app.update((x) => ({ ...x, plans: [...x.plans, revertPlan(x, v, app.today())] }), `Now on a copy of version ${v}`);
  };
  return h('div', { class: 'list' }, plans.map((p) => h('div', { class: 'version' },
    h('span', { class: 'v' }, `v${p.version}`),
    h('span', { class: 'grow' },
      h('div', { class: 'strong small' }, p.reason),
      h('div', { class: 'tiny muted' }, `From ${formatShort(p.effectiveFrom)}${p.version === current.version ? ' · current' : ''}`)),
    p.version !== current.version ? h('button', { class: 'btn small', type: 'button', onclick: () => revert(p.version) }, 'Go back') : null)));
}

export function coachView(app) {
  const today = app.today();
  const r = coachReview(app.state, today);
  const b = r.block;
  return h('div', null,
    topbar('Coach', { sub: `Block ${b.number} · Week ${b.week} · ${b.label}` }),
    h('div', { class: 'content' },
      h('div', { class: 'card accent-strength' }, h('h3', null, b.label), h('p', { class: 'small' }, b.text)),
      r.suggestions.length || (app.coachGhosts && app.coachGhosts.size) ? h('div', { class: 'section-title' }, 'Suggested changes') : null,
      suggestionList(app, r.suggestions),
      r.notes.length ? h('div', { class: 'section-title' }, 'Notes') : null,
      r.notes.map((n) => noteCard(app, n)),
      !r.suggestions.length && !r.notes.length ? h('div', { class: 'card info' },
        h('h3', null, 'No changes suggested'),
        h('p', { class: 'small' }, 'The coach looks at your last two workouts of each exercise. Keep logging; when an exercise is ready, a suggestion appears here with the evidence.')) : null,
      h('div', { class: 'section-title' }, 'Where each exercise stands'),
      h('div', { class: 'list' }, exerciseStanding(app.state, today).map((x) => h('div', { class: 'list-item standing' },
        h('span', { class: `tone ${x.tone}`, 'aria-hidden': 'true' }),
        h('span', { class: 'grow' },
          h('b', null, x.name), h('span', { class: 'tiny muted' }, ` · Session ${x.sessionId} · ${x.target}`),
          h('div', { class: 'small' }, x.text))))),
      h('details', { class: 'explain' },
        h('summary', null, 'How the coach decides'),
        h('div', null,
          h('p', null, 'An exercise steps up only when your last two workouts of it hit the top of the range on every set, with 2 or more reps in reserve (or a session effort of 7 or less), no pain, and recovery looks fine.'),
          h('p', null, 'Weeks 1–2: no increases. Weeks 3–4: add 1–2 reps. Weeks 5–6: change one thing: slower lowering, longer pause, a harder version or an extra set (only if the session stays within 40 minutes). Weeks 7–8: hold or add a rep, then benchmark tests.'),
          h('p', null, 'It eases off first when you flag pain, miss reps twice, rate two sessions 9 or more, or say sore legs affected a run. At most two changes per session at a time, and never just because a week has passed. Nothing changes until you accept it.'))),
      b.week >= 7 && b.phase !== 'review' ? h('button', { class: 'link', type: 'button', onclick: () => app.go('#/coach/block') }, `Preview the block ${b.number} review`) : null,
      h('button', { class: 'btn block', type: 'button', onclick: () => copySummary(app) }, 'Copy summary for Claude'),
      h('div', { class: 'section-title' }, 'Plan history'),
      history(app)));
}
