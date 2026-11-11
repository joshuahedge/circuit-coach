// Block review: how the 8 weeks went, and the next block's changes (each switchable) before it starts.
import { h, topbar, toggle } from './dom.js';
import { nextBlockProposals, applyNextBlock } from '../blockReview.js';
import { prescriptionLabel, tempoLabel } from '../plan.js';
import { formatShort } from '../dates.js';

const BENCH = [
  ['pressUps', 'Press-ups', ''], ['plankSec', 'Front plank', ' s'], ['bridgeLeft', 'SL bridge left', ''],
  ['bridgeRight', 'SL bridge right', ''], ['squats', 'Squats', ''], ['lunges', 'Lunges per leg', ''],
];

const rx = (p) => `${prescriptionLabel(p)}${tempoLabel(p) ? ` · ${tempoLabel(p)}` : ''}`;

function exerciseRow(ex) {
  const unit = ex.unit === 'seconds' ? 's' : 'reps';
  const trend = ex.count ? `${ex.firstAvg} → ${ex.lastAvg} ${unit} a set over ${ex.count} workouts` : 'not logged this block';
  const tags = [];
  if (ex.progressions) tags.push(h('span', { class: 'tag good' }, `▲ ${ex.progressions} step${ex.progressions > 1 ? 's' : ''} up`));
  else if (ex.count) tags.push(h('span', { class: 'tag' }, 'no step up'));
  if (ex.painCount) tags.push(h('span', { class: 'tag warn' }, `pain ×${ex.painCount}`));
  return h('div', { class: 'list-item' },
    h('span', { class: 'grow' }, h('b', null, ex.name), h('div', { class: 'small muted' }, `Session ${ex.sessionId} · ${trend}`)),
    h('span', { class: 'row wrap', style: { justifyContent: 'flex-end', gap: '4px' } }, tags));
}

export function blockReviewView(app) {
  const today = app.today();
  const { summary: sum, proposals, notes } = nextBlockProposals(app.state, today);
  if (!app.blockChoice || app.blockChoice.block !== sum.number) {
    app.blockChoice = { block: sum.number, off: new Set(proposals.filter((p) => p.defaultOff).map((p) => p.key)) };
  }
  const choice = app.blockChoice;
  const picked = proposals.filter((p) => !choice.off.has(p.key));
  const nextN = sum.number + 1;

  const start = () => {
    const before = app.state;
    app.blockChoice = null;
    app.update((x) => applyNextBlock(x, today, picked));
    app.go('#/week');
    app.toast(`Block ${nextN} started${picked.length ? ` with ${picked.length} change${picked.length > 1 ? 's' : ''}` : ''}.`, {
      ms: 8000, action: { label: 'Undo', run: () => { app.update(() => before); app.go('#/coach/block'); } },
    });
  };

  const benchRows = sum.bench.start && sum.bench.latest
    ? BENCH.filter(([k]) => sum.bench.start[k] != null && sum.bench.latest[k] != null).map(([k, label, unit]) => {
      const a = sum.bench.start[k];
      const b = sum.bench.latest[k];
      return h('div', { class: 'rx-line' }, h('span', { class: 'muted' }, label),
        h('span', { class: 'strong' }, `${a}${unit} → ${b}${unit}`, b > a ? ' ▲' : b < a ? ' ▼' : ''));
    })
    : [];

  return h('div', null,
    topbar(`Block ${sum.number} review`, { sub: sum.startDate ? `${formatShort(sum.startDate)} – ${formatShort(today)}` : null, back: () => app.go('#/coach') }),
    h('div', { class: 'content' },
      sum.phase !== 'review' ? h('div', { class: 'banner run' },
        `Block ${sum.number} is in week ${sum.week} of 8. You can review it and start the next block early, or wait until it ends.`) : null,
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, `${sum.done}/${sum.planned}`), h('span', null, 'sessions done')),
        h('div', { class: 'stat' }, h('b', null, sum.avgEffort === null ? '–' : `${sum.avgEffort}/10`), h('span', null, 'average effort'))),
      notes.map((n) => h('div', { class: `card ${n.kind === 'praise' ? 'good' : n.kind === 'benchmark' ? 'info' : 'warn'}` },
        h('p', { class: 'small' }, n.text),
        n.action === 'benchmark' ? h('button', { class: 'btn block', type: 'button', onclick: () => app.go('#/log/benchmark') }, 'Log benchmark tests') : null)),

      h('div', { class: 'section-title' }, 'How each exercise went'),
      h('div', { class: 'list' }, sum.exercises.map(exerciseRow)),

      benchRows.length ? [
        h('div', { class: 'section-title' }, `Benchmarks: ${formatShort(sum.bench.start.date)} → ${formatShort(sum.bench.latest.date)}`),
        h('div', { class: 'card stack' }, benchRows),
      ] : null,

      h('div', { class: 'section-title' }, `Changes for block ${nextN}`),
      proposals.length
        ? proposals.map((p) => {
          const on = !choice.off.has(p.key);
          return h('div', { class: `card${on ? '' : ' ghost'}` },
            h('div', { class: 'switch-row' },
              h('span', null, h('div', { class: 'kind progress' }, `Session ${p.sessionId}${p.kind === 'third-session' ? ' · optional' : p.rule === 'fresh' ? ' · variety' : ''}`), h('b', null, p.title)),
              toggle({ checked: on, label: `Keep: ${p.title}`, onChange: (v) => { if (v) choice.off.delete(p.key); else choice.off.add(p.key); app.render(); } })),
            h('p', { class: 'small' }, p.reason),
            p.kind === 'third-session' ? h('div', { class: 'list' }, p.addSession.session.exercises.map((x) => h('div', { class: 'list-item' },
              h('span', { class: 'grow' }, h('b', null, x.variation), h('div', { class: 'small muted' }, rx(x)))))) : h('div', { class: 'diff' },
              h('span', { class: 'from' }, `${p.from.variation !== p.to.variation ? `${p.from.variation}: ` : ''}${rx(p.from)}`),
              h('span', { 'aria-hidden': 'true' }, '→'),
              h('span', { class: 'to' }, `${p.from.variation !== p.to.variation ? `${p.to.variation}: ` : ''}${rx(p.to)}`)));
        })
        : h('div', { class: 'card info' }, h('p', { class: 'small' }, 'No changes needed: the plan carries on as it is, and the coach keeps building on what you did.')),
      h('p', { class: 'small muted' }, `Block ${nextN} starts this week. Weeks 1–2 settle in with no increases, then the coach picks up again. Every change can be undone from Plan history.`),
      h('div', { class: 'sticky-action' },
        h('button', { class: 'btn strength block', type: 'button', onclick: start },
          `Start block ${nextN}${picked.length ? ` with ${picked.length} change${picked.length > 1 ? 's' : ''}` : ''}`))));
}
