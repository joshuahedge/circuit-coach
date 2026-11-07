// Local calendar dates as 'YYYY-MM-DD' strings. Weeks start on Monday.
// Arithmetic goes through UTC components so daylight-saving changes never shift a day.

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_NAMES = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
export const DAY_SHORT = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n) => String(n).padStart(2, '0');

function parts(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function utcMs(iso) {
  const { y, m, d } = parts(iso);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms) {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isISODate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return fromUtcMs(utcMs(s)) === s;
}

export function addDays(iso, n) {
  return fromUtcMs(utcMs(iso) + n * 86400000);
}

export function daysBetween(a, b) {
  return Math.round((utcMs(b) - utcMs(a)) / 86400000);
}

// 0 = Monday ... 6 = Sunday
export function weekdayIndex(iso) {
  return (new Date(utcMs(iso)).getUTCDay() + 6) % 7;
}

export function dayKey(iso) {
  return DAY_KEYS[weekdayIndex(iso)];
}

export function weekStart(iso) {
  return addDays(iso, -weekdayIndex(iso));
}

export function weekDays(iso) {
  const start = weekStart(iso);
  return DAY_KEYS.map((_, i) => addDays(start, i));
}

export function formatShort(iso) {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

export function formatDay(iso) {
  return `${DAY_SHORT[dayKey(iso)]} ${formatShort(iso)}`;
}
