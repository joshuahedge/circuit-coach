// Progress: weekly running, consistency, exercise trends, run pace, session effort, benchmarks.
import { h, topbar, chips } from './dom.js';
import { barChart, lineChart } from './chart.js';
import { exerciseSeries, loggedExerciseIds, runPaceSeries, weeklyTotals, effortSeries, benchmarkSeries } from '../stats.js';
import { EXERCISES } from '../library.js';
import { RUN_TYPE_LABEL } from '../schedule.js';
import { formatShort } from '../dates.js';
import { formatDuration, formatPace } from '../pace.js';

const paceTick = (v) => formatPace(v).replace(' /km', '');

function card(title, sub, ...body) {
  return h('div', { class: 'card' }, h('h3', null, title), sub ? h('p', { class: 'small muted' }, sub) : null, body);
}

function empty(text) {
  return h('p', { class: 'small muted' }, text);
}

function consistency(weeks, plannedS, plannedR) {
  return h('div', null,
    h('div', { class: 'consistency', role: 'img', 'aria-label': `Sessions per week, last ${weeks.length} weeks: ${weeks.map((w) => `${formatShort(w.weekStart)} ${w.strength} strength, ${w.runs} runs`).join('; ')}` },
      weeks.map((w) => h('div', { class: 'col' },
        Array.from({ length: Math.max(plannedS, w.strength) }, (_, i) => h('i', { class: `pip${i < w.strength ? ' s' : ''}` })),
        h('div', { style: { height: '4px' } }),
        Array.from({ length: Math.max(plannedR, w.runs) }, (_, i) => h('i', { class: `pip${i < w.runs ? ' r' : ''}` })),
        h('span', null, formatShort(w.weekStart).split(' ')[0])))),
    h('div', { class: 'chart-legend' },
      h('span', null, h('i', { style: { background: 'var(--strength)' } }), 'Strength (top)'),
      h('span', null, h('i', { style: { background: 'var(--run)' } }), 'Runs (bottom)'),
      h('span', null, h('i', { style: { background: 'var(--surface-2)' } }), 'Planned, not done')));
}

export function progressView(app) {
  const s = app.state;
  const today = app.today();
  const ui = app.progressUi || (app.progressUi = { exercise: null, runType: 'all' });
  const weeks = weeklyTotals(s, today, 8);
  const plannedS = Object.keys(s.schedule.strengthDays).length;
  const plannedR = Object.keys(s.schedule.runDays).length;

  const logged = loggedExerciseIds(s);
  if (!ui.exercise || !logged.includes(ui.exercise)) ui.exercise = logged.includes('press-up') ? 'press-up' : logged[0] || null;
  const exSeries = ui.exercise ? exerciseSeries(s, ui.exercise) : [];
  const exUnit = exSeries.length && exSeries[0].unit === 'seconds' ? 's' : 'reps';
  const variationChanges = exSeries.filter((p, i) => i > 0 && p.variation !== exSeries[i - 1].variation);

  const allRuns = runPaceSeries(s);
  const types = [...new Set(allRuns.map((r) => r.runType))];
  if (ui.runType !== 'all' && !types.includes(ui.runType)) ui.runType = 'all';
  const runs = ui.runType === 'all' ? allRuns : allRuns.filter((r) => r.runType === ui.runType);
  const effort = effortSeries(s);
  const tenK = benchmarkSeries(s, 'tenKSec');
  const benches = [...s.benchmarks].sort((a, b) => (a.date < b.date ? 1 : -1));

  return h('div', null,
    topbar('Progress'),
    h('div', { class: 'content' },
      card('Weekly running', `Kilometres per week. More is not automatically better.`,
        barChart({
          label: 'Kilometres run per week, last 8 weeks',
          bars: weeks.map((w) => ({ label: formatShort(w.weekStart).split(' ')[0], value: w.km, title: `Week of ${formatShort(w.weekStart)}: ${w.km.toFixed(1)} km, ${w.runs} run${w.runs === 1 ? '' : 's'}` })),
          format: (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)),
        })),

      card('Consistency', `Sessions per week against your plan of ${plannedS} strength and ${plannedR} runs.`, consistency(weeks, plannedS, plannedR)),

      card('Strength exercises', 'Average per set, each session.',
        logged.length
          ? [
            h('select', {
              'aria-label': 'Exercise', style: { marginBottom: '10px' }, value: ui.exercise,
              onchange: (e) => { ui.exercise = e.target.value; app.render(); },
            }, logged.map((id) => h('option', { value: id }, EXERCISES[id] ? EXERCISES[id].name : id))),
            exSeries.length
              ? lineChart({
                label: `${EXERCISES[ui.exercise].name}: average ${exUnit} per set`,
                points: exSeries.map((p) => ({ date: p.date, value: p.avg, title: `${formatShort(p.date)}: ${p.avg} ${exUnit} avg, best ${p.best} (${p.variation})` })),
                format: (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)),
                valueHeader: `Avg ${exUnit}`,
              })
              : empty('No sets logged yet.'),
            variationChanges.map((p) => h('p', { class: 'tiny muted' }, `${p.variation} from ${formatShort(p.date)}`)),
          ]
          : empty('Log a strength session to see each exercise here.')),

      card('Run pace', 'Faster is higher.',
        allRuns.length
          ? [
            types.length > 1 ? h('div', { style: { marginBottom: '10px' } }, chips({
              options: [{ value: 'all', label: 'All' }, ...types.map((t) => ({ value: t, label: RUN_TYPE_LABEL[t] || t }))],
              value: ui.runType, label: 'Run type', onChange: (v) => { ui.runType = v || 'all'; app.render(); },
            })) : null,
            runs.length ? lineChart({
              label: `Run pace${ui.runType === 'all' ? '' : `, ${RUN_TYPE_LABEL[ui.runType]} runs`}`,
              points: runs.map((r) => ({ date: r.date, value: r.pace, title: `${formatShort(r.date)}: ${formatPace(r.pace)}, ${Number(r.km).toFixed(1)} km ${(RUN_TYPE_LABEL[r.runType] || '').toLowerCase()}` })),
              format: paceTick, invert: true, color: 'var(--run)', valueHeader: 'Pace /km',
            }) : empty('No runs of this type yet.'),
          ]
          : empty('Log a run to see your pace here.')),

      card('Session effort', 'Strength sessions, 1–10. Aim for challenging but repeatable.',
        effort.length
          ? lineChart({
            label: 'Strength session effort',
            points: effort.map((e) => ({ date: e.date, value: e.rpe, title: `${formatShort(e.date)}: Session ${e.sessionId}, effort ${e.rpe}/10` })),
            yMin: 1, yMax: 10, valueHeader: 'Effort',
          })
          : empty('Rate your effort at the end of a session to see it here.')),

      card('Benchmarks', 'Repeat every 4–8 weeks.',
        tenK.length > 1 ? lineChart({
          label: '10K time', points: tenK.map((t) => ({ date: t.date, value: t.value, title: `${formatShort(t.date)}: 10K in ${formatDuration(t.value)}` })),
          format: (v) => formatDuration(v), invert: true, color: 'var(--run)', valueHeader: '10K',
        }) : null,
        benches.length
          ? h('div', { class: 'scroll-x' }, h('table', { class: 'bench' },
            h('thead', null, h('tr', null, ['Date', 'Press-ups', 'Plank', 'Bridge L/R', 'Squats', 'Lunges', '10K'].map((x) => h('th', null, x)))),
            h('tbody', null, benches.map((b) => h('tr', null,
              h('td', null, formatShort(b.date)),
              h('td', null, b.pressUps ?? '–'),
              h('td', null, b.plankSec != null ? `${b.plankSec}s` : '–'),
              h('td', null, b.bridgeLeft != null || b.bridgeRight != null ? `${b.bridgeLeft ?? '–'}/${b.bridgeRight ?? '–'}` : '–'),
              h('td', null, b.squats ?? '–'),
              h('td', null, b.lunges ?? '–'),
              h('td', null, b.tenKSec ? formatDuration(b.tenKSec) : '–'))))))
          : empty('No benchmarks yet.'),
        h('button', { class: 'btn block', type: 'button', style: { marginTop: '12px' }, onclick: () => app.go('#/log/benchmark') }, 'Log benchmark tests'))));
}
