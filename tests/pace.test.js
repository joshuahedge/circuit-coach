import { describe, it, expect } from './harness.js';
import { parseDuration, formatDuration, paceSecPerKm, formatPace } from '../src/pace.js';

describe('pace', () => {
  it('parses minutes, m:ss and h:mm:ss', () => {
    expect(parseDuration('65')).toBe(3900);
    expect(parseDuration('65:30')).toBe(3930);
    expect(parseDuration('1:05:30')).toBe(3930);
    expect(parseDuration(' 28:05 ')).toBe(1685);
    expect(parseDuration('0:45')).toBe(45);
  });

  it('rejects junk, zero and bad seconds', () => {
    expect(parseDuration('')).toBe(null);
    expect(parseDuration('abc')).toBe(null);
    expect(parseDuration('0')).toBe(null);
    expect(parseDuration('10:75')).toBe(null);
    expect(parseDuration('1:2:3:4')).toBe(null);
    expect(parseDuration('-5')).toBe(null);
  });

  it('formats durations', () => {
    expect(formatDuration(1685)).toBe('28:05');
    expect(formatDuration(3930)).toBe('1:05:30');
    expect(formatDuration(59)).toBe('0:59');
  });

  it('calculates pace per km', () => {
    expect(paceSecPerKm(10, 3900)).toBe(390);
    expect(paceSecPerKm(0, 3900)).toBe(null);
    expect(paceSecPerKm(5, 0)).toBe(null);
  });

  it('formats pace', () => {
    expect(formatPace(390)).toBe('6:30 /km');
    expect(formatPace(359.6)).toBe('6:00 /km');
    expect(formatPace(null)).toBe('–');
  });
});
