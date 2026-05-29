import { describe, expect, it } from 'vitest';

import {
  addRecurrence,
  formatSingaporeDate,
  getSingaporeNow,
  isAtLeastOneMinuteInFuture,
  parseDateTimeLocalToSingaporeISO,
  toDateTimeLocalFromISO,
  toSingaporeMonthKey,
} from '../lib/timezone';

describe('timezone utilities', () => {
  it('converts datetime-local values to Singapore ISO', () => {
    expect(parseDateTimeLocalToSingaporeISO('2026-05-29T10:30')).toBe('2026-05-29T10:30:00+08:00');
    expect(parseDateTimeLocalToSingaporeISO('2026-05-29T10:30:45')).toBe('2026-05-29T10:30:45+08:00');
    expect(parseDateTimeLocalToSingaporeISO(null)).toBeNull();
  });

  it('converts ISO values into datetime-local strings in Singapore timezone', () => {
    expect(toDateTimeLocalFromISO('2026-05-29T10:30:00+08:00')).toBe('2026-05-29T10:30');
    expect(toDateTimeLocalFromISO(null)).toBe('');
  });

  it('checks that due dates are at least one minute in the future', () => {
    const future = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const nearFuture = new Date(Date.now() + 10 * 1000).toISOString();

    expect(isAtLeastOneMinuteInFuture(future)).toBe(true);
    expect(isAtLeastOneMinuteInFuture(nearFuture)).toBe(false);
  });

  it('adds recurrence correctly for each recurrence pattern', () => {
    const base = '2026-05-29T02:00:00.000Z';

    const daily = new Date(addRecurrence(base, 'daily')).getTime();
    const weekly = new Date(addRecurrence(base, 'weekly')).getTime();
    const monthly = new Date(addRecurrence(base, 'monthly')).getUTCMonth();
    const yearly = new Date(addRecurrence(base, 'yearly')).getUTCFullYear();

    expect(daily - new Date(base).getTime()).toBe(24 * 60 * 60 * 1000);
    expect(weekly - new Date(base).getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(monthly).toBe(5);
    expect(yearly).toBe(2027);
  });

  it('returns original input when recurrence source date is invalid', () => {
    expect(addRecurrence('not-a-date', 'daily')).toBe('not-a-date');
  });

  it('derives Singapore month key from an ISO timestamp', () => {
    expect(toSingaporeMonthKey('2026-08-09T08:30:00+08:00')).toBe('2026-08');
  });

  it('supports Date input for month key and formats date output', () => {
    expect(toSingaporeMonthKey(new Date('2026-12-25T10:00:00+08:00'))).toBe('2026-12');
    expect(formatSingaporeDate('2026-12-25T10:00:00+08:00').length).toBeGreaterThan(0);
  });

  it('returns current time close to system time', () => {
    const now = Date.now();
    const sgNow = getSingaporeNow().getTime();

    expect(Math.abs(sgNow - now)).toBeLessThan(120000);
  });
});
