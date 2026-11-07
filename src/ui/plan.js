// Plan: sessions and exercises, schedule, profile, and data (backup, restore, reset).
import { h, fill, ICONS, topbar, chips, group, field, numberInput } from './dom.js';
import { openSheet, confirmSheet } from './sheet.js';
import { openRxEditor, copySummary } from './coach.js';
import { EXERCISES, WARMUPS, COOLDOWN, REST_NOTE, LIMITATION_NOTE, SAFETY_NOTE } from '../library.js';
import { currentPlan, estimateMinutes, prescriptionLabel, tempoLabel, withPrescription } from '../plan.js';
import { recommendStrengthDays, scheduleWarnings, SCHEDULE_RUN_LABEL } from '../schedule.js';
import { DAY_KEYS, DAY_NAMES, DAY_SHORT, formatShort } from '../dates.js';
import { emptyState, makeBackup, readBackup } from '../store.js';
import { APP_VERSION } from '../version.js';

function changePlan(app, sessionId, from, to, reason) {
  const today = app.today();
  app.update((s) => ({ ...s, plans: [...s.plans, withPrescription(currentPlan(s), sessionId, from.exerciseId, to, { today, reason })] }),
    'Plan updated');
}

function exerciseSheet(app, sessionId, p) {
  const ex = EXERCISES[p.exerciseId];
  openSheet(app, p.variation, (close) => h('div', null,
    h('div', { class: 'card' },
      h('div', { class: 'strong', style: { color: 'var(--strength)' } }, [prescriptionLabel(p), tempoLabel(p)].filter(Boolean).join(' · ')),
      h('p', { class: 'small muted' }, `${ex.cues} Set since ${formatShort(p.since)}.`),
      h('ol', { class: 'small' }, ex.howTo.map((t) => h('li', null, t)))),
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
    h('div', { class: 'section-title' }, 'Swaps'),
    h('div', { class: 'list' }, ex.swaps.map((sw) => h('div', { class: 'list-item' },
      h('span', { class: 'grow' }, h('b', null, sw.name), h('div', { class: 'small muted' }, sw.note)),
      h('button', {
        class: 'btn small', type: 'button',
        onclick: () => { close(); changePlan(app, sessionId, p, { ...p, variation: sw.name }, `You swapped ${p.variation} for ${sw.name}`); },
      }, 'Use')))),
    h('div', { class: 'section-title' }, 'Harder versions, in order'),
    h('div', { class: 'list' }, ex.ladder.map((l) => h('div', { class: 'list-item' },
      h('span', { class: 'grow' }, h('b', null, l.name), h('div', { class: 'small muted' }, `starts at ${l.min}–${l.max}${ex.unit === 'seconds' ? ' s' : ''}`)),
      l.name === p.variation ? h('span', { class: 'tag good' }, 'current') : null)))));
}

function sessionCard(app, plan, id) {
  const s = plan.sessions[id];
  return h('div', null,
    h('div', { class: 'section-title' }, `Session ${id} · about ${estimateMinutes(s)} min`),
    h('div', { class: 'card accent-strength tight' }, h('b', null, s.focus), h('p', { class: 'small muted' }, `Warm-up: ${WARMUPS[id]}`)),
    h('div', { class: 'list' }, s.exercises.map((p) => h('button', { class: 'list-item', type: 'button', onclick: () => exerciseSheet(app, id, p) },
      h('span', { class: 'grow' }, h('b', null, p.variation),
        h('div', { class: 'small muted' }, [prescriptionLabel(p), tempoLabel(p), p.runProtectSets ? `${p.runProtectSets} sets before a long run` : ''].filter(Boolean).join(' · '))),
      h('span', { class: 'chev', html: ICONS.chev })))));
}

function scheduleSheet(app) {
  const st = app.state.schedule;
  const w = { runDays: { ...st.runDays }, strengthDays: { ...st.strengthDays } };
  openSheet(app, 'Your week', (close) => {
    const body = h('div');
    const draw = () => {
      const days = DAY_KEYS.filter((d) => d in w.runDays);
      const dayOf = (id) => Object.keys(w.strengthDays).find((d) => w.strengthDays[d] === id);
      const setDay = (id, d) => {
        const other = id === 'A' ? 'B' : 'A';
        const od = dayOf(other);
        w.strengthDays = { [d]: id, ...(od && od !== d ? { [od]: other } : {}) };
        draw();
      };
      const valid = days.length > 0 && days.every((d) => w.runDays[d]) && dayOf('A') && dayOf('B');
      const rec = recommendStrengthDays(w.runDays);
      fill(body,
        group('Run days', h('div', { class: 'day-pick' }, DAY_KEYS.map((d) => h('button', {
          type: 'button', class: 'chip', 'aria-pressed': String(d in w.runDays), 'aria-label': `Run on ${DAY_NAMES[d]}`,
          onclick: () => { if (d in w.runDays) delete w.runDays[d]; else w.runDays[d] = null; draw(); },
        }, DAY_SHORT[d])))),
        days.map((d) => group(`${DAY_NAMES[d]} run`, chips({
          options: [{ value: 'easy', label: 'Easy' }, { value: 'quality', label: 'Quality' }, { value: 'long', label: 'Long' }, { value: 'other', label: 'Other' }],
          value: w.runDays[d], label: `${DAY_NAMES[d]} run type`, onChange: (v) => { w.runDays[d] = v; draw(); },
        }))),
        ['A', 'B'].map((id) => group(`Session ${id}`, h('div', { class: 'day-pick' }, DAY_KEYS.map((d) => h('button', {
          type: 'button', class: 'chip', 'aria-pressed': String(dayOf(id) === d), 'aria-label': `Session ${id} on ${DAY_NAMES[d]}`, onclick: () => setDay(id, d),
        }, DAY_SHORT[d]))))),
        h('button', { class: 'link', type: 'button', onclick: () => { w.strengthDays = { ...rec.strengthDays }; draw(); } }, 'Use the recommended strength days'),
        scheduleWarnings(w).map((x) => h('div', { class: `banner ${x.level === 'warn' ? 'warn' : 'run'}` }, x.text)),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'),
          h('button', {
            class: 'btn primary', type: 'button', disabled: !valid,
            onclick: () => { close(); app.update((s) => ({ ...s, schedule: { runDays: { ...w.runDays }, strengthDays: { ...w.strengthDays } } }), 'Schedule saved'); },
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
      text: `It holds ${sm.strengthCount} strength sessions, ${sm.runCount} runs and ${sm.checkinCount} check-ins${span}. It replaces everything on this phone now.`,
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
    title: 'Erase everything?', text: 'All workouts, runs, check-ins and plan versions on this phone will be deleted. Back up first if you might want them.',
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
      sessionCard(app, plan, 'A'),
      sessionCard(app, plan, 'B'),
      h('div', { class: 'card info' },
        h('p', { class: 'small' }, h('b', null, 'Rest. '), REST_NOTE),
        h('p', { class: 'small' }, h('b', null, 'Cool-down. '), COOLDOWN),
        h('p', { class: 'small muted' }, LIMITATION_NOTE),
        h('p', { class: 'small muted' }, SAFETY_NOTE)),

      h('div', { class: 'section-title' }, 'Schedule'),
      h('div', { class: 'list' },
        DAY_KEYS.filter((d) => d in sd.runDays || sd.strengthDays[d]).map((d) => h('div', { class: 'list-item' },
          h('b', { style: { width: '44px' } }, DAY_SHORT[d]),
          h('span', { class: 'grow' }, [d in sd.runDays ? SCHEDULE_RUN_LABEL[sd.runDays[d]] || 'Run' : '', sd.strengthDays[d] ? `Session ${sd.strengthDays[d]}` : ''].filter(Boolean).join(' + ')))),
        h('button', { class: 'list-item', type: 'button', onclick: () => scheduleSheet(app) }, h('span', { class: 'grow strong', style: { color: 'var(--run)' } }, 'Change schedule'))),

      h('div', { class: 'section-title' }, 'Profile'),
      h('div', { class: 'list' },
        h('button', { class: 'list-item', type: 'button', onclick: () => profileSheet(app) },
          h('span', { class: 'grow' }, h('b', null, 'About you'), h('div', { class: 'small muted' }, body || 'Not set')), h('span', { class: 'chev', html: ICONS.chev })),
        h('div', { class: 'list-item' }, h('span', { class: 'grow' }, h('b', null, 'Goals'), h('div', { class: 'small muted' }, prof.goals.join(' · ')))),
        h('div', { class: 'list-item' }, h('span', { class: 'grow' }, h('b', null, 'Kit and limits'),
          h('div', { class: 'small muted' }, `Bodyweight and a mat · ${prof.sessionMinutes.join('–')} min sessions · never ${prof.disliked.join(' or ')}`)))),

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
      h('p', { class: 'tiny muted', style: { textAlign: 'center', marginTop: '18px' } }, `Strength & Running Coach ${APP_VERSION}`)));
}
