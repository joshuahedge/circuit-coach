// Tiny DOM helpers and shared controls. h(tag, props, ...children) builds elements; children may be nested
// arrays, strings, numbers, nodes, or null/false (skipped).

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v; // trusted, code-defined markup only (icons)
    else if (k === 'value') value = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  if (value !== undefined) el.value = value;
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// replaceChildren that accepts the same nested arrays and nulls as h().
export function fill(el, ...children) {
  el.replaceChildren();
  return append(el, children);
}

export function svg(markup, cls = '') {
  const span = h('span', { class: `ico ${cls}`, 'aria-hidden': 'true', html: markup });
  return span;
}

const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICONS = {
  week: P('<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 3v3M16 3v3"/>'),
  log: P('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  progress: P('<path d="M4 19V5M4 19h16"/><path d="M7.5 14.5l3.5-4 3 2.5 4.5-6"/>'),
  coach: P('<path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
  plan: P('<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 8.5h6M9 12h6M9 15.5h4"/>'),
  check: P('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  back: P('<path d="M15 5l-7 7 7 7"/>'),
  chev: P('<path d="M9 5l7 7-7 7"/>'),
  run: P('<circle cx="14.5" cy="4.5" r="2"/><path d="M8 21l3-6 3 2v5M6.5 12.5l2.5-4 4 1 2.5 3.5 3 .5"/>'),
  heart: P('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  flag: P('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
};

export function icon(name) {
  return svg(ICONS[name] || '');
}

export function topbar(title, { sub = null, back = null, right = null } = {}) {
  return h('header', { class: 'topbar' },
    back ? h('button', { class: 'back', 'aria-label': 'Back', onclick: back, html: ICONS.back }) : null,
    h('h1', null, title, sub ? h('span', { class: 'sub' }, sub) : null),
    right);
}

// Choice chips. options: [{ value, label }]; onChange(value). Tapping the selected chip again clears it
// when allowClear is set.
export function chips({ options, value, onChange, label, scale = false, allowClear = false }) {
  const wrap = h('div', { class: `chips${scale ? ' scale' : ''}`, role: 'group', 'aria-label': label || null });
  // Up to 6 options in one row; 1–10 goes in two rows of 5 so every button stays thumb-sized.
  if (scale) wrap.style.setProperty('--n', String(options.length > 6 ? 5 : options.length));
  let current = value;
  const buttons = options.map((o) => {
    const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(o.value === current), dataset: { value: String(o.value) } }, o.label);
    b.addEventListener('click', () => {
      current = allowClear && current === o.value ? null : o.value;
      buttons.forEach((x, i) => x.setAttribute('aria-pressed', String(options[i].value === current)));
      onChange(current);
    });
    return b;
  });
  append(wrap, buttons);
  return wrap;
}

// bad: which end is the worrying one ('low' or 'high'), marked the same way on every scale.
export function scaleChips({ min, max, value, onChange, label, lowLabel, highLabel, bad = null }) {
  const options = [];
  for (let i = min; i <= max; i++) options.push({ value: i, label: String(i) });
  return h('div', null,
    chips({ options, value, onChange, label, scale: true, allowClear: true }),
    lowLabel || highLabel ? h('div', { class: 'scale-labels' },
      h('span', { class: bad === 'low' ? 'bad' : null }, lowLabel || ''),
      h('span', { class: bad === 'high' ? 'bad' : null }, highLabel || '')) : null);
}

export function stepper({ value, min = 0, max = 999, step = 1, onChange, label }) {
  let v = value;
  const out = h('span', { class: 'stepper-value', 'aria-live': 'polite' }, String(v));
  const set = (n) => {
    v = Math.max(min, Math.min(max, n));
    out.textContent = String(v);
    onChange(v);
  };
  const el = h('span', { class: 'stepper', role: 'group', 'aria-label': label || null },
    h('button', { type: 'button', 'aria-label': `Less${label ? `: ${label}` : ''}`, onclick: () => set(v - step) }, '−'),
    out,
    h('button', { type: 'button', 'aria-label': `More${label ? `: ${label}` : ''}`, onclick: () => set(v + step) }, '+'));
  return el;
}

export function toggle({ checked, onChange, label }) {
  const b = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(Boolean(checked)), 'aria-label': label });
  b.addEventListener('click', () => {
    const on = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(on));
    onChange(on);
  });
  return b;
}

export function field(label, control, hint = null) {
  return h('label', { class: 'field' }, h('span', { class: 'label' }, label), control, hint ? h('span', { class: 'hint' }, hint) : null);
}

export function group(label, control, hint = null) {
  return h('div', { class: 'field', role: 'group' }, h('span', { class: 'label' }, label), control, hint ? h('span', { class: 'hint' }, hint) : null);
}

export function numberInput({ value, onInput, placeholder = '', decimal = false, unit = null, min = null, max = null, label = null }) {
  const input = h('input', {
    type: 'text', inputmode: decimal ? 'decimal' : 'numeric', pattern: decimal ? null : '[0-9]*', placeholder,
    value: value === null || value === undefined ? '' : String(value), 'aria-label': label,
    autocomplete: 'off', enterkeyhint: 'done',
  });
  input.addEventListener('input', () => {
    const raw = input.value.replace(',', '.').trim();
    let n = raw === '' ? null : Number(raw);
    if (n !== null && !Number.isFinite(n)) n = NaN;
    if (n !== null && Number.isFinite(n) && ((min !== null && n < min) || (max !== null && n > max))) n = NaN;
    onInput(n);
  });
  return unit ? h('span', { class: 'unit-input' }, input, h('span', { class: 'unit' }, unit)) : input;
}

export function parseNum(raw, { decimal = false } = {}) {
  const s = String(raw ?? '').replace(',', '.').trim();
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return decimal ? n : Math.round(n);
}
