// Progress: consistency, exercise trends, session effort, benchmarks.
import { h, topbar } from './dom.js';
import { lineChart } from './chart.js';
import { exerciseSeries, loggedExerciseIds, weeklyTotals, effortSeries, benchmarkSeries } from '../stats.js';
import { exerciseById, EXERCISES } from '../library.js';
import { formatShort } from '../dates.js';

const dm = (iso) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;

function card(title, sub, ...body) {
  return h('div', { class: 'card' }, h('h3', null, title), sub ? h('p', { class: 'small muted' }, sub) : null, body);
}

function empty(text) {
  return h('p', { class: 'small muted' }, text);
}

function consistency(weeks, planned) {
  return h('div', null,
    h('div', { class: 'consistency', role: 'img', 'aria-label': `Sessions per week, last ${weeks.length} weeks: ${weeks.map((w) => `${formatShort(w.weekStart)} ${w.strength}`).join('; ')}` },
      weeks.map((w) => h('div', { class: 'col' },
        Array.from({ length: Math.max(planned, w.strength) }, (_, i) => h('i', { class: `pip${i < w.strength ? ' s' : ''}` })),
        h('span', null, dm(w.weekStart))))),
    h('div', { class: 'chart-legend' },
      h('span', null, h('i', { style: { background: 'var(--chart-strength)' } }), 'Session done'),
      h('span', null, h('i', { style: { background: 'var(--surface-2)' } }), 'Planned, not done')));
}

export function progressView(app) {
  const s = app.state;
  const today = app.today();
  const ui = app.progressUi || (app.progressUi = { exercise: null });
  const weeks = weeklyTotals(s, today, 8);
  const planned = Object.keys(s.schedule.strengthDays).length;

  const logged = loggedExerciseIds(s);
  if (!ui.exercise || !logged.includes(ui.exercise)) ui.exercise = logged.includes('press-up') ? 'press-up' : logged[0] || null;
  const exSeries = ui.exercise ? exerciseSeries(s, ui.exercise) : [];
  const exUnit = exSeries.length && exSeries[0].unit === 'seconds' ? 's' : 'reps';
  const variationChanges = exSeries.filter((p, i) => i > 0 && p.variation !== exSeries[i - 1].variation);

  const effort = effortSeries(s);
  const pressUps = benchmarkSeries(s, 'pressUps');
  const benches = [...s.benchmarks].sort((a, b) => (a.date < b.date ? 1 : -1));

  return h('div', null,
    topbar('Progress'),
    h('div', { class: 'content' },
      card('Consistency', `Sessions per week against your plan of ${planned}.`, consistency(weeks, planned)),

      card('Exercises', 'Average per set, each session.',
        logged.length
          ? [
            h('select', {
              'aria-label': 'Exercise', style: { marginBottom: '10px' }, value: ui.exercise,
              onchange: (e) => { ui.exercise = e.target.value; app.render(); },
            }, logged.map((id) => h('option', { value: id }, exerciseById(id) ? exerciseById(id).name : id))),
            exSeries.length
              ? lineChart({
                label: `${exerciseById(ui.exercise).name}: average ${exUnit} per set`,
                points: exSeries.map((p) => ({ date: p.date, value: p.avg, title: `${formatShort(p.date)}: ${p.avg} ${exUnit} avg, best ${p.best} (${p.variation})` })),
                format: (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)),
                valueHeader: `Avg ${exUnit}`,
              })
              : empty('No sets logged yet.'),
            variationChanges.map((p) => h('p', { class: 'tiny muted' }, `${p.variation} from ${formatShort(p.date)}`)),
          ]
          : empty('Log a session to see each exercise here.')),

      card('Session effort', '1–10. Aim for challenging but repeatable.',
        effort.length
          ? lineChart({
            label: 'Session effort',
            points: effort.map((e) => ({ date: e.date, value: e.rpe, title: `${formatShort(e.date)}: Session ${e.sessionId}, effort ${e.rpe}/10` })),
            yMin: 1, yMax: 10, valueHeader: 'Effort',
          })
          : empty('Rate your effort at the end of a session to see it here.')),

      card('Benchmarks', 'Repeat every 4–8 weeks.',
        pressUps.length > 1 ? lineChart({
          label: 'Benchmark press-ups', points: pressUps.map((t) => ({ date: t.date, value: t.value, title: `${formatShort(t.date)}: ${t.value} press-ups` })),
          valueHeader: 'Press-ups',
        }) : null,
        benches.length
          ? h('div', { class: 'scroll-x' }, h('table', { class: 'bench' },
            h('thead', null, h('tr', null, ['Date', 'Press-ups', 'Plank', 'Bridge L/R', 'Squats', 'Lunges'].map((x) => h('th', null, x)))),
            h('tbody', null, benches.map((b) => h('tr', null,
              h('td', null, formatShort(b.date)),
              h('td', null, b.pressUps ?? '–'),
              h('td', null, b.plankSec != null ? `${b.plankSec}s` : '–'),
              h('td', null, b.bridgeLeft != null || b.bridgeRight != null ? `${b.bridgeLeft ?? '–'}/${b.bridgeRight ?? '–'}` : '–'),
              h('td', null, b.squats ?? '–'),
              h('td', null, b.lunges ?? '–'))))))
          : empty('No benchmarks yet.'),
        h('button', { class: 'btn block', type: 'button', style: { marginTop: '12px' }, onclick: () => app.go('#/log/benchmark') }, 'Log benchmark tests'))));
}
