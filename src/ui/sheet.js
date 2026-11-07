// Bottom sheets, confirm dialogs and toasts, drawn into the app's layer element.
import { h } from './dom.js';

export function openSheet(app, title, build) {
  closeSheets(app);
  const close = () => {
    backdrop.remove();
    panel.remove();
    document.removeEventListener('keydown', onKey);
    if (app.lastFocus && app.lastFocus.isConnected) app.lastFocus.focus();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  app.lastFocus = document.activeElement;
  const backdrop = h('div', { class: 'backdrop', onclick: close });
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1' },
    h('div', { class: 'grab' }),
    h('h2', null, title));
  const body = build(close);
  if (body) panel.append(body);
  app.layer.append(backdrop, panel);
  document.addEventListener('keydown', onKey);
  panel.focus({ preventScroll: true });
  app.closeSheet = close;
  return close;
}

export function closeSheets(app) {
  app.layer.querySelectorAll('.backdrop, .sheet').forEach((el) => el.remove());
  app.closeSheet = null;
}

export function confirmSheet(app, { title, text, confirmLabel = 'Confirm', danger = false, cancelLabel = 'Cancel' }) {
  return new Promise((resolve) => {
    let answered = false;
    const finish = (close, v) => { answered = true; close(); resolve(v); };
    openSheet(app, title, (close) => {
      const wrap = h('div', null,
        text ? h('p', { class: 'muted' }, text) : null,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn', type: 'button', onclick: () => finish(close, false) }, cancelLabel),
          h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, type: 'button', 'data-confirm': '1', onclick: () => finish(close, true) }, confirmLabel)));
      // A backdrop tap or Escape closes without an answer: treat as cancel.
      const observer = new MutationObserver(() => {
        if (!wrap.isConnected && !answered) { observer.disconnect(); resolve(false); }
      });
      setTimeout(() => observer.observe(app.layer, { childList: true }), 0);
      return wrap;
    });
  });
}

export function toast(app, text, { level = 'info', action = null, ms = 3200 } = {}) {
  app.layer.querySelectorAll('.toast').forEach((el) => el.remove());
  const el = h('div', { class: `toast${level === 'warn' ? ' warn' : ''}`, role: 'status' }, text,
    action ? h('button', { type: 'button', onclick: () => { el.remove(); action.run(); } }, action.label) : null);
  app.layer.append(el);
  setTimeout(() => el.remove(), action ? ms + 2500 : ms);
  return el;
}
