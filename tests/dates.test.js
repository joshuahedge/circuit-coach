import { describe, it, expect } from './harness.js';
import {
  todayISO, addDays, daysBetween, weekStart, weekDays, dayKey, DAY_KEYS, DAY_NAMES, formatShort, formatDay, isISODate,
} from '../src/dates.js';

describe('dates', () => {
  it('todayISO uses the local calendar date', () => {
    expect(todayISO(new Date(2026, 10, 7, 23, 59))).toBe('2026-11-07');
    expect(todayISO(new Date(2026, 0, 3, 0, 1))).toBe('2026-01-03');
  });

  it('addDays crosses month and year ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('addDays is safe across daylight-saving changes', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });

  it('daysBetween counts whole days, signed', () => {
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
    expect(daysBetween('2026-11-08', '2026-11-01')).toBe(-7);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('weekStart is the Monday of the week', () => {
    expect(weekStart('2026-11-07')).toBe('2026-11-02'); // Saturday
    expect(weekStart('2026-11-08')).toBe('2026-11-02'); // Sunday
    expect(weekStart('2026-11-09')).toBe('2026-11-09'); // Monday
  });

  it('weekDays lists Monday to Sunday', () => {
    const days = weekDays('2026-11-05');
    expect(days.length).toBe(7);
    expect(days[0]).toBe('2026-11-02');
    expect(days[6]).toBe('2026-11-08');
  });

  it('dayKey and names', () => {
    expect(dayKey('2026-11-02')).toBe('mon');
    expect(dayKey('2026-11-07')).toBe('sat');
    expect(dayKey('2026-11-08')).toBe('sun');
    expect(DAY_KEYS).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    expect(DAY_NAMES.wed).toBe('Wednesday');
  });

  it('formats short dates', () => {
    expect(formatShort('2026-11-03')).toBe('3 Nov');
    expect(formatDay('2026-11-03')).toBe('Tue 3 Nov');
  });

  it('isISODate validates real calendar dates', () => {
    expect(isISODate('2026-11-07')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('7/11/2026')).toBe(false);
    expect(isISODate('')).toBe(false);
  });
});
