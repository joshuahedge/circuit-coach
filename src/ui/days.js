// Picking the two training days: Session A on one day, Session B on another.
import { h, group } from './dom.js';
import { DAY_KEYS, DAY_NAMES, DAY_SHORT } from '../dates.js';

export function dayOf(strengthDays, id) {
  return Object.keys(strengthDays).find((d) => strengthDays[d] === id) || null;
}

// Returns a new { day: id } map with `id` moved to `day` (the other session keeps its day unless it was there).
export function withSessionDay(strengthDays, id, day) {
  const other = id === 'A' ? 'B' : 'A';
  const otherDay = dayOf(strengthDays, other);
  const next = { [day]: id };
  if (otherDay && otherDay !== day) next[otherDay] = other;
  return next;
}

export function sessionDayPickers(strengthDays, onPick) {
  return ['A', 'B'].map((id) => group(`Session ${id}`, h('div', { class: 'day-pick' }, DAY_KEYS.map((d) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(dayOf(strengthDays, id) === d), 'aria-label': `Session ${id} on ${DAY_NAMES[d]}`,
    onclick: () => onPick(id, d),
  }, DAY_SHORT[d])))));
}
