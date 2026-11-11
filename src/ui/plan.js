// Plan: sessions and exercises, schedule, profile, and data (backup, restore, reset).
import { h, fill, ICONS, topbar, field, numberInput } from './dom.js';
import { dayOf, sessionDayPickers, withSessionDay } from './days.js';
import { exerciseFigure, imageCredits } from './figure.js';
import { howToFor } from '../routines.js';
import { openSheet, confirmSheet } from './sheet.js';
import { openRxEditor, copySummary } from './coach.js';
import { exerciseById, EXERCISES, WARMUPS, COOLDOWN, REST_NOTE, LIMITATION_NOTE, SAFETY_NOTE } from '../library.js';
import { currentPlan, estimateMinutes, prescriptionLabel, sessionIds, tempoLabel, withPrescription, sidesFor, targetMinutes } from '../plan.js';
import { scheduleWarnings } from '../schedule.js';
import { DAY_KEYS, DAY_SHORT, formatShort } from '../dates.js';
import { emptyState, makeBackup, readBackup } from '../store.js';
import { APP_VERSION } from '../version.js';

function changePlan(app, sessionId, from, to, reason) {
  const today = app.today();
  app.update((s) => ({ ...s, plans: [...s.plans, withPrescription(currentPlan(s), sessionId, from.exerciseId, to, { today, reason })] }),
    'Plan updated');
}

function exerciseSheet(app, sessionId, p) {
  const ex = exerciseById(p.exerciseId);
  openSheet(app, p.variation, (close) => h('div', null,
    exerciseFigure(p.exerciseId, p.variation),
    h('div', { class: 'card' },
      h('div', { class: 'strong', style: { color: 'var(--strength)' } }, [prescriptionLabel(p), tempoLabel(p)].filter(Boolean).join(' · ')),
      h('p', { class: 'small muted' }, `${howToFor(p.exerciseId, p.variation).cues} Set since ${formatShort(p.since)}.`),
      h('ol', { class: 'small' }, howToFor(p.exerciseId, p.variation).howTo.map((t) => h('li', null, t)))),
    h('button', {
      class: 'btn primary block', type: 'button',
      onclick: () => {
        close();
        openRxEditor(app, {
          title: `Change ${p.variation}`, p,
          onSave: (to) => changePlan(app, sessionId, p, to, `You changed ${p.variation}: ${prescriptionLabel(p)} → ${to.variation !== p.variation ? `${to.variation} ` : ''}${prescriptionLabel(to)}`),
        });
      },
    }, 'Change numbers or version'),
    ex.swaps.length ? h('div', { class: 'section-title' }, 'Swaps') : null,
    ex.swaps.length ? h('div', { class: 'list' }, ex.swaps.map((sw) => h('div', { class: 'list-item' },
      h('span', { class: 'grow' }, h('b', null, sw.name), h('div', { class: 'small muted' }, sw.note)),
      h('button', {
        class: 'btn small', type: 'button',
        onclick: () => { close(); changePlan(app, sessionId, p, { ...p, variation: sw.name, sides: sidesFor(p.exerciseId, sw.name, p) }, `You swapped ${p.variation} for ${sw.name}`); },
      }, 'Use')))) : null,
    ex.ladder.length ? h('div', { class: 'section-title' }, 'Harder versions, in order') : null,
    ex.ladder.length ? h('div', { class: 'list' }, ex.ladder.map((l) => h('div', { class: 'list-item' },
      h('span', { class: 'grow' }, h('b', null, l.name), h('div', { class: 'small muted' }, `starts at ${l.min}–${l.max}${ex.unit === 'seconds' ? ' s' : ''}`)),
      l.name === p.variation ? h('span', { class: 'tag good' }, 'current') : null))) : null));
}

function sessionCard(app, plan, id) {
  const s = plan.sessions[id];
  return h('div', null,
    h('div', { class: 'section-title' }, `Session ${id} · about ${estimateMinutes(s)} min · target ${targetMinutes(s)}`),
    h('div', { class: 'card accent-strength tight' }, h('b', null, s.focus), h('p', { class: 'small muted' }, `Warm-up: ${WARMUPS[id] || WARMUPS.C}`)),
    h('div', { class: 'list' }, s.exercises.map((p) => h('button', { class: 'list-item', type: 'button', onclick: () => exerciseSheet(app, id, p) },
      h('span', { class: 'grow' }, h('b', null, p.variation),
        h('div', { class: 'small muted' }, [prescriptionLabel(p), tempoLabel(p)].filter(Boolean).join(' · '))),
      h('span', { class: 'chev', html: ICONS.chev })))),
    h('button', { class: 'btn block', type: 'button', onclick: () => app.go(`#/plan/edit/${id}`) }, `Edit Session ${id}`),
    id === 'A' || id === 'B' ? null : h('button', { class: 'btn ghost block', type: 'button', style: { marginTop: '8px' }, onclick: () => removeSession(app, id) }, `Remove Session ${id}`));
}

// Session C can go again: a new plan version without it, and its training day freed (Undo restores both).
async function removeSession(app, id) {
  const d = app.state.draft;
  if (d && d.sessionId === id) { app.toast(`Finish or discard your Session ${id} workout first.`); return; }
  const ok = await confirmSheet(app, {
    title: `Remove Session ${id}?`, text: 'Your logged workouts stay in Progress. You can add a third session again at a later block review.',
    confirmLabel: 'Remove', danger: true,
  });
  if (!ok) return;
  const before = app.state;
  const today = app.today();
  app.update((x) => {
    const plan = currentPlan(x);
    const sessions = { ...plan.sessions };
    delete sessions[id];
    const strengthDays = Object.fromEntries(Object.entries(x.schedule.strengthDays).filter(([, v]) => v !== id));
    const version = { version: plan.version + 1, effectiveFrom: today, createdAt: today, acceptedByUser: true, sessions, reason: `You removed Session ${id}` };
    return { ...x, plans: [...x.plans, version], schedule: { ...x.schedule, strengthDays } };
  });
  app.toast(`Session ${id} removed`, { action: { label: 'Undo', run: () => app.update(() => before, `Session ${id} is back`) }, ms: 6000 });
}

function scheduleSheet(app) {
  let days = { ...app.state.schedule.strengthDays };
  const ids = sessionIds(currentPlan(app.state));
  openSheet(app, 'Your training days', (close) => {
    const body = h('div');
    const draw = () => {
      const valid = ids.every((id) => dayOf(days, id));
      fill(body,
        sessionDayPickers(days, (id, d) => { days = withSessionDay(days, id, d); draw(); }, ids),
        scheduleWarnings({ strengthDays: days }).map((x) => h('div', { class: 'banner warn' }, x.text)),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
          h('button', {
            class: 'btn primary', type: 'button', disabled: !valid,
            onclick: () => { close(); app.update((s) => ({ ...s, schedule: { ...s.schedule, strengthDays: { ...days } } }), 'Training days saved'); },
          }, 'Save')));
    };
    draw();
    return body;
  });
}

function profileSheet(app) {
  const p = { ...app.state.profile };
  openSheet(app, 'About you', (close) => h('div', null,
    h('p', { class: 'small muted' }, 'Optional. Stays on this phone.'),
    h('div', { class: 'grid3' },
      field('Age', numberInput({ value: p.age, onInput: (n) => { p.age = Number.isFinite(n) ? n : null; } })),
      field('Height', numberInput({ value: p.heightCm, unit: 'cm', onInput: (n) => { p.heightCm = Number.isFinite(n) ? n : null; } })),
      field('Weight', numberInput({ value: p.weightKg, unit: 'kg', decimal: true, onInput: (n) => { p.weightKg = Number.isFinite(n) ? n : null; } }))),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); app.update((s) => ({ ...s, profile: { ...s.profile, ...p } }), 'Saved'); } }, 'Save'))));
}

export async function backupNow(app) {
  const { filename, json } = makeBackup(app.state, app.now());
  const nav = app.win.navigator;
  const markDone = () => app.update((s) => ({ ...s, settings: { ...s.settings, lastBackupAt: app.today() } }), 'Backup saved');
  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = h('a', { href: url, download: filename, style: { display: 'none' } });
    app.win.document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    markDone();
  };
  let file = null;
  try { file = new File([json], filename, { type: 'application/json' }); } catch (e) { file = null; }
  if (file && nav && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Training backup' });
      markDone();
    } catch (e) {
      if (e && e.name === 'AbortError') app.toast('Backup cancelled');
      else download();
    }
    return;
  }
  download();
}

export function pickBackupFile(app) {
  const doc = app.win.document;
  const input = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  input.addEventListener('change', async () => {
    const f = input.files && input.files[0];
    input.remove();
    if (!f) return;
    const text = await f.text();
    const r = readBackup(text);
    if (!r.ok) { app.toast(r.error, { level: 'warn', ms: 6000 }); return; }
    const sm = r.summary;
    const span = sm.firstDate ? ` from ${formatShort(sm.firstDate)} to ${formatShort(sm.lastDate)}` : '';
    const ok = await confirmSheet(app, {
      title: 'Restore this backup?',
      text: `It holds ${sm.strengthCount} sessions and ${sm.checkinCount} check-ins${span}. It replaces everything on this phone now.`,
      confirmLabel: 'Restore', danger: true,
    });
    if (!ok) return;
    app.restore(text);
    app.route = { name: 'week' };
    if (app.useHash) app.win.location.hash = '#/week';
    app.render();
    app.toast('Backup restored.', app.hasStash ? { action: { label: 'Undo', run: () => app.undoReplace() }, ms: 8000 } : undefined);
  });
  doc.body.append(input);
  input.click();
}

async function resetAll(app) {
  const ok = await confirmSheet(app, {
    title: 'Erase everything?', text: 'All sessions, check-ins and plan versions on this phone will be deleted. Back up first if you might want them.',
    confirmLabel: 'Erase everything', danger: true,
  });
  if (!ok) return;
  app.replaceState(emptyState(app.now()));
  app.route = { name: 'week' };
  if (app.useHash) app.win.location.hash = '#/week';
  app.render();
  app.toast('Everything erased.', app.hasStash ? { action: { label: 'Undo', run: () => app.undoReplace() }, ms: 8000 } : undefined);
}

export function planView(app) {
  const s = app.state;
  const plan = currentPlan(s);
  const sd = s.schedule;
  const prof = s.profile;
  const body = [prof.age ? `${prof.age} years` : '', prof.heightCm ? `${prof.heightCm} cm` : '', prof.weightKg ? `${prof.weightKg} kg` : ''].filter(Boolean).join(' · ');
  return h('div', null,
    topbar('Plan', { sub: `Version ${plan.version} · from ${formatShort(plan.effectiveFrom)}` }),
    h('div', { class: 'content' },
      sessionIds(plan).map((id) => sessionCard(app, plan, id)),
      h('div', { class: 'card info' },
        h('p', { class: 'small' }, h('b', null, 'Rest. '), REST_NOTE),
        h('p', { class: 'small' }, h('b', null, 'Cool-down. '), COOLDOWN),
        h('p', { class: 'small muted' }, LIMITATION_NOTE),
        h('p', { class: 'small muted' }, SAFETY_NOTE)),

      h('div', { class: 'section-title' }, 'Training days'),
      h('div', { class: 'list' },
        DAY_KEYS.filter((d) => sd.strengthDays[d]).map((d) => h('div', { class: 'list-item' },
          h('b', { style: { width: '44px' } }, DAY_SHORT[d]),
          h('span', { class: 'grow' }, `Session ${sd.strengthDays[d]}`))),
        h('button', { class: 'list-item', type: 'button', onclick: () => scheduleSheet(app) }, h('span', { class: 'grow strong', style: { color: 'var(--run)' } }, 'Change training days'))),

      h('div', { class: 'section-title' }, 'Profile'),
      h('div', { class: 'list' },
        h('button', { class: 'list-item', type: 'button', onclick: () => profileSheet(app) },
          h('span', { class: 'grow' }, h('b', null, 'About you'), h('div', { class: 'small muted' }, body || 'Not set')), h('span', { class: 'chev', html: ICONS.chev })),
        h('div', { class: 'list-item' }, h('span', { class: 'grow' }, h('b', null, 'Goals'), h('div', { class: 'small muted' }, prof.goals.join(' · ')))),
        h('div', { class: 'list-item' }, h('span', { class: 'grow' }, h('b', null, 'Kit and limits'),
          h('div', { class: 'small muted' }, `Bodyweight, a mat and household furniture · sessions ${Object.keys(plan.sessions).map((id) => `${id} ${targetMinutes(plan.sessions[id])}`).join(', ')} min · never ${prof.disliked.join(' or ')}`)))),

      h('div', { class: 'section-title' }, 'Your data'),
      h('div', { class: 'card' },
        h('p', { class: 'small' }, s.settings.lastBackupAt ? `Last backup ${formatShort(s.settings.lastBackupAt)}.` : 'Not backed up yet.',
          ' Your training lives only on this phone; a backup file in Files or iCloud Drive keeps it safe.'),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => backupNow(app) }, 'Back up'),
          h('button', { class: 'btn', type: 'button', onclick: () => pickBackupFile(app) }, 'Restore'))),
      h('button', { class: 'btn block', type: 'button', onclick: () => copySummary(app) }, 'Copy summary for Claude'),
      h('div', { style: { height: '10px' } }),
      h('button', { class: 'btn danger block', type: 'button', onclick: () => resetAll(app) }, 'Erase all data'),
      imageCredits() ? [h('div', { class: 'section-title' }, 'Image credits'), imageCredits()] : null,
      h('p', { class: 'tiny muted', style: { textAlign: 'center', marginTop: '18px' } }, `Circuit Coach ${APP_VERSION}`)));
}
