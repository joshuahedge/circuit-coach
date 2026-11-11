// Picking training days: one day per session (A, B, and C if you have one).
import { h, group } from './dom.js';
import { DAY_KEYS, DAY_NAMES, DAY_SHORT } from '../dates.js';

export function dayOf(strengthDays, id) {
  return Object.keys(strengthDays).find((d) => strengthDays[d] === id) || null;
}

// Returns a new { day: id } map with `id` moved to `day`. A session already on that day swaps to id's old day
// (or loses its day, if id had none).
export function withSessionDay(strengthDays, id, day) {
  const from = dayOf(strengthDays, id);
  const next = { ...strengthDays };
  if (from) delete next[from];
  const there = next[day];
  if (there && from) next[from] = there;
  next[day] = id;
  return next;
}

export function sessionDayPickers(strengthDays, onPick, ids = ['A', 'B']) {
  return ids.map((id) => group(`Session ${id}`, h('div', { class: 'day-pick' }, DAY_KEYS.map((d) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(dayOf(strengthDays, id) === d), 'aria-label': `Session ${id} on ${DAY_NAMES[d]}`,
    onclick: () => onPick(id, d),
  }, DAY_SHORT[d])))));
}
