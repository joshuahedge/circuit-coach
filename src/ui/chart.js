// Small SVG charts: one series each (the card title names it), thin marks, recessive grid, a selective
// direct label on the latest value, tap or hover for any value, and a data table underneath.
import { h } from './dom.js';
import { daysBetween } from '../dates.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 340;

function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, String(v));
  for (const k of kids.flat()) if (k) el.append(k);
  return el;
}

export function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw) || raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

function figure(svgEl, tip, table, label) {
  return h('figure', { style: { margin: '0', position: 'relative' }, role: 'group', 'aria-label': label },
    svgEl, tip,
    h('details', { class: 'tiny muted', style: { marginTop: '6px' } }, h('summary', null, 'Show data'), table));
}

function tooltip() {
  return h('div', {
    class: 'small', role: 'status',
    style: {
      position: 'absolute', top: '0', left: '0', pointerEvents: 'none', display: 'none', transform: 'translate(-50%, -110%)',
      background: 'var(--primary)', color: 'var(--on-primary)', padding: '4px 8px', borderRadius: '8px', whiteSpace: 'nowrap', fontWeight: '650',
    },
  });
}

function showTip(tip, svgEl, x, y, text) {
  const box = svgEl.getBoundingClientRect();
  const scale = box.width / W || 1;
  tip.textContent = text;
  tip.style.left = `${Math.max(40, Math.min(box.width - 40, x * scale))}px`;
  tip.style.top = `${y * scale}px`;
  tip.style.display = 'block';
}

function dataTable(rows, headers) {
  return h('table', { class: 'bench' },
    h('thead', null, h('tr', null, headers.map((x) => h('th', null, x)))),
    h('tbody', null, rows.map((r) => h('tr', null, r.map((c) => h('td', null, c))))));
}

// bars: [{ label, value, title }]
export function barChart({ bars, format = (v) => String(v), label, color = 'var(--chart-run)', height = 170 }) {
  const top = 22;
  const bottom = 22;
  const left = 30;
  const plotH = height - top - bottom;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const ticks = niceTicks(0, max, 3);
  const yMax = ticks[ticks.length - 1];
  const y = (v) => top + plotH - (v / yMax) * plotH;
  const slot = (W - left) / bars.length;
  const bw = Math.max(8, Math.min(28, slot - 8));
  const tip = tooltip();
  const svgEl = s('svg', { viewBox: `0 0 ${W} ${height}`, class: 'chart', role: 'img', 'aria-label': label });
  for (const t of ticks) {
    svgEl.append(s('line', { class: 'grid', x1: left, x2: W, y1: y(t), y2: y(t) }));
    svgEl.append(s('text', { class: 'axis', x: left - 6, y: y(t) + 4, 'text-anchor': 'end' }, document.createTextNode(format(t))));
  }
  bars.forEach((b, i) => {
    const cx = left + slot * i + slot / 2;
    const x0 = cx - bw / 2;
    const yv = y(b.value);
    const r = Math.min(4, (top + plotH - yv) / 2);
    if (b.value > 0) {
      // Rounded data end, square at the baseline.
      const base = top + plotH;
      svgEl.append(s('path', {
        class: 'bar', fill: color,
        d: `M${x0},${base} V${yv + r} Q${x0},${yv} ${x0 + r},${yv} H${x0 + bw - r} Q${x0 + bw},${yv} ${x0 + bw},${yv + r} V${base} Z`,
      }));
    }
    svgEl.append(s('text', { class: 'axis', x: cx, y: height - 6, 'text-anchor': 'middle' }, document.createTextNode(b.label)));
    if (i === bars.length - 1 && b.value > 0) {
      svgEl.append(s('text', { class: 'lbl', x: cx, y: yv - 6, 'text-anchor': 'middle' }, document.createTextNode(format(b.value))));
    }
    const hit = s('rect', { x: left + slot * i, y: top, width: slot, height: plotH, fill: 'transparent', tabindex: '0', 'aria-label': b.title });
    const show = () => showTip(tip, svgEl, cx, yv, b.title);
    hit.addEventListener('pointerenter', show);
    hit.addEventListener('click', show);
    hit.addEventListener('focus', show);
    hit.addEventListener('pointerleave', () => { tip.style.display = 'none'; });
    svgEl.append(hit);
  });
  return figure(svgEl, tip, dataTable(bars.map((b) => [b.label, format(b.value)]), ['', 'Value']), label);
}

// points: [{ date, value, title }]; invert puts smaller values higher (pace: faster is up).
export function lineChart({ points, format = (v) => String(v), label, color = 'var(--chart-strength)', height = 180, invert = false, yMin = null, yMax = null, valueHeader = 'Value', dateFormat }) {
  const top = 22;
  const bottom = 22;
  const left = 38;
  const right = 18;
  const plotH = height - top - bottom;
  const vals = points.map((p) => p.value);
  const ticks = niceTicks(yMin ?? Math.min(...vals), yMax ?? Math.max(...vals), 3);
  const lo = yMin ?? ticks[0];
  const hi = yMax ?? ticks[ticks.length - 1];
  const yOf = (v) => {
    const t = (v - lo) / (hi - lo || 1);
    return invert ? top + t * plotH : top + plotH - t * plotH;
  };
  const first = points[0].date;
  const spanDays = Math.max(1, daysBetween(first, points[points.length - 1].date));
  const xOf = (d) => (points.length === 1 ? (left + W - right) / 2 : left + (daysBetween(first, d) / spanDays) * (W - left - right));
  const tip = tooltip();
  const svgEl = s('svg', { viewBox: `0 0 ${W} ${height}`, class: 'chart', role: 'img', 'aria-label': label });
  for (const t of ticks.filter((x) => x >= lo && x <= hi)) {
    svgEl.append(s('line', { class: 'grid', x1: left, x2: W - right, y1: yOf(t), y2: yOf(t) }));
    svgEl.append(s('text', { class: 'axis', x: left - 6, y: yOf(t) + 4, 'text-anchor': 'end' }, document.createTextNode(format(t))));
  }
  const fmtDate = dateFormat || ((d) => d.slice(8, 10).replace(/^0/, '') + '/' + d.slice(5, 7).replace(/^0/, ''));
  svgEl.append(s('text', { class: 'axis', x: left, y: height - 6, 'text-anchor': 'start' }, document.createTextNode(fmtDate(first))));
  if (points.length > 1) svgEl.append(s('text', { class: 'axis', x: W - right, y: height - 6, 'text-anchor': 'end' }, document.createTextNode(fmtDate(points[points.length - 1].date))));
  if (points.length > 1) {
    svgEl.append(s('path', { class: 'line', stroke: color, d: points.map((p, i) => `${i ? 'L' : 'M'}${xOf(p.date).toFixed(1)},${yOf(p.value).toFixed(1)}`).join(' ') }));
  }
  points.forEach((p, i) => {
    const cx = xOf(p.date);
    const cy = yOf(p.value);
    svgEl.append(s('circle', { class: 'dot', cx, cy, r: 4.5, fill: color }));
    if (i === points.length - 1) {
      svgEl.append(s('text', { class: 'lbl', x: cx, y: cy - 10, 'text-anchor': cx > W - 40 ? 'end' : 'middle' }, document.createTextNode(format(p.value))));
    }
    const hit = s('circle', { cx, cy, r: 16, fill: 'transparent', tabindex: '0', 'aria-label': p.title });
    const show = () => showTip(tip, svgEl, cx, cy, p.title);
    hit.addEventListener('pointerenter', show);
    hit.addEventListener('click', show);
    hit.addEventListener('focus', show);
    hit.addEventListener('pointerleave', () => { tip.style.display = 'none'; });
    svgEl.append(hit);
  });
  return figure(svgEl, tip, dataTable(points.map((p) => [p.date, format(p.value)]), ['Date', valueHeader]), label);
}
