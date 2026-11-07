// App controller: holds the state, saves it after every change, routes by URL hash, and draws the current view.
import { loadState, saveState, emptyState, readBackup, stashBeforeReplace, readStash } from './store.js';
import { todayISO } from './dates.js';
import { coachReview } from './coach.js';
import { h, ICONS, topbar } from './ui/dom.js';
import { closeSheets, toast, confirmSheet } from './ui/sheet.js';
import { setupView } from './ui/setup.js';
import { weekView } from './ui/week.js';
import { logView } from './ui/log.js';
import { strengthView } from './ui/strength.js';
import { runView, checkinView, benchmarkView } from './ui/forms.js';
import { progressView } from './ui/progress.js';
import { coachView } from './ui/coach.js';
import { planView, pickBackupFile } from './ui/plan.js';

export function parseRoute(hash) {
  const [a, b, c] = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (a === 'log' && b === 'strength' && (c === 'A' || c === 'B')) return { name: 'strength', sessionId: c };
  if (a === 'log' && b === 'run') return { name: 'run', id: c || null };
  if (a === 'log' && b === 'checkin') return { name: 'checkin', id: c || null };
  if (a === 'log' && b === 'benchmark') return { name: 'benchmark', id: c || null };
  if (['week', 'log', 'progress', 'coach', 'plan'].includes(a)) return { name: a, section: b || null };
  return { name: 'week' };
}

const routeKey = (r) => JSON.stringify(r);

const VIEWS = {
  week: weekView, log: logView, strength: strengthView, run: runView, checkin: checkinView,
  benchmark: benchmarkView, progress: progressView, coach: coachView, plan: planView,
};

const TABS = [
  { name: 'week', label: 'Week', icon: 'week' },
  { name: 'log', label: 'Log', icon: 'log' },
  { name: 'progress', label: 'Progress', icon: 'progress' },
  { name: 'coach', label: 'Coach', icon: 'coach' },
  { name: 'plan', label: 'Plan', icon: 'plan' },
];
const TAB_OF = { strength: 'log', run: 'log', checkin: 'log', benchmark: 'log' };

function tabbar(app) {
  const active = TAB_OF[app.route.name] || app.route.name;
  const count = coachReview(app.state, app.today()).suggestions.length;
  return h('nav', { class: 'tabbar', 'aria-label': 'Main' },
    TABS.map((t) => h('a', {
      class: 'tab', href: `#/${t.name}`, 'aria-current': t.name === active ? 'page' : null,
      onclick: (e) => { if (!app.useHash) { e.preventDefault(); app.go(`#/${t.name}`); } },
    },
    h('span', { 'aria-hidden': 'true', html: ICONS[t.icon] }),
    t.label,
    t.name === 'coach' && count ? h('span', { class: 'badge', 'aria-label': `${count} suggestions` }, String(count)) : null)));
}

function recoveryView(app) {
  const newer = app.loadSource === 'newer';
  return h('div', null,
    topbar('Your data needs attention'),
    h('div', { class: 'content' },
      h('div', { class: 'card warn' },
        h('h2', null, newer ? 'Saved by a newer version' : 'Saved data could not be read'),
        h('p', null, newer
          ? 'Your training data was saved by a newer version of the app. Close the app completely and open it again to update.'
          : 'The training data saved on this phone could not be read. Restore your latest backup file, or start fresh.')),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => pickBackupFile(app) }, 'Restore from a backup file'),
      h('div', { style: { height: '10px' } }),
      h('button', {
        class: 'btn danger block', type: 'button',
        onclick: async () => {
          const ok = await confirmSheet(app, { title: 'Start fresh?', text: 'This replaces whatever is saved on this phone with an empty app.', confirmLabel: 'Start fresh', danger: true });
          if (ok) { app.state = emptyState(app.now()); app.loadSource = 'main'; app.save(); app.render(); }
        },
      }, 'Start fresh')));
}

export function createApp({ root, storage, now = () => new Date(), useHash = true, win = window }) {
  const loaded = loadState(storage, now());
  const app = {
    root, storage, now, win, useHash,
    state: loaded.state,
    loadSource: loaded.source,
    route: parseRoute(useHash ? win.location.hash : ''),
    cleanups: [],
    lastKey: null,
  };
  root.textContent = '';
  app.frame = h('div', { class: 'app' });
  app.layer = h('div', { class: 'layer' });
  root.append(app.frame, app.layer);

  app.today = () => todayISO(app.now());
  app.toast = (text, opts) => toast(app, text, opts);
  app.onLeave = (fn) => { app.cleanups.push(fn); };

  // Persist the state. fn(state) may return a new state; without fn the current (mutated) state is saved.
  app.save = (fn) => {
    if (fn) {
      const next = fn(app.state);
      if (next) app.state = next;
    }
    const ok = saveState(storage, app.state);
    if (!ok) app.toast("Couldn't save. Back up your data now from the Plan tab.", { level: 'warn', ms: 8000 });
    return ok;
  };
  app.update = (fn, message) => {
    app.save(fn);
    app.render();
    if (message) app.toast(message);
  };
  app.go = (path) => {
    if (useHash && win.location.hash !== path) {
      win.location.hash = path; // hashchange renders
      return;
    }
    app.route = parseRoute(path);
    app.render();
  };
  // Replace everything (restore or erase), keeping the old data under its own key for Undo.
  app.replaceState = (next) => {
    app.hasStash = stashBeforeReplace(storage);
    app.state = next;
    app.loadSource = 'main';
    app.save();
  };
  app.restore = (text) => {
    const r = readBackup(text);
    if (!r.ok) return r;
    app.replaceState(r.state);
    return r;
  };
  app.undoReplace = () => {
    const old = readStash(storage);
    if (!old) { app.toast('Nothing to undo.'); return false; }
    app.state = old;
    app.loadSource = 'main';
    app.save();
    app.render();
    app.toast('Your previous data is back.');
    return true;
  };
  app.render = () => {
    for (const fn of app.cleanups.splice(0)) {
      try { fn(); } catch (e) { /* ignore */ }
    }
    closeSheets(app);
    const key = routeKey(app.route);
    const changed = key !== app.lastKey;
    app.lastKey = key;
    app.renderedDay = app.today();
    let view;
    let tabs = true;
    if (!app.state) { view = recoveryView(app); tabs = false; } else if (!app.state.setupDone) { view = setupView(app); tabs = false; } else view = VIEWS[app.route.name](app);
    // During a workout the tab bar gives way to the Now dock: one task, nothing else to tap by mistake.
    const focus = tabs && app.route.name === 'strength' && app.state.draft && app.state.draft.sessionId === app.route.sessionId;
    app.frame.className = `app${tabs && !focus ? '' : ' no-tabs'}${focus ? ' focus' : ''}`;
    app.frame.replaceChildren(view);
    if (tabs && !focus) app.frame.append(tabbar(app));
    if (changed && typeof win.scrollTo === 'function' && useHash) win.scrollTo(0, 0);
  };

  if (useHash) {
    win.addEventListener('hashchange', () => {
      app.route = parseRoute(win.location.hash);
      app.render();
    });
    // A home-screen app can sit in the background overnight: redraw when the date has moved on.
    win.document.addEventListener('visibilitychange', () => {
      if (win.document.visibilityState === 'visible' && app.renderedDay !== app.today()) app.render();
    });
  }
  app.render();
  if (loaded.source === 'prev') app.toast('Your data was recovered from the last good save.', { ms: 5000 });
  return app;
}
