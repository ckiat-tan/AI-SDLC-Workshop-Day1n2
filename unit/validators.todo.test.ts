import { describe, expect, it } from 'vitest';

import { isValidPriority, isValidRecurrence } from '../lib/validators/todo';

describe('todo validators', () => {
  it('validates supported priorities', () => {
    expect(isValidPriority('high')).toBe(true);
    expect(isValidPriority('medium')).toBe(true);
    expect(isValidPriority('low')).toBe(true);
    expect(isValidPriority('urgent')).toBe(false);
    expect(isValidPriority(null)).toBe(false);
  });

  it('validates supported recurrence patterns', () => {
    expect(isValidRecurrence('daily')).toBe(true);
    expect(isValidRecurrence('weekly')).toBe(true);
    expect(isValidRecurrence('monthly')).toBe(true);
    expect(isValidRecurrence('yearly')).toBe(true);
    expect(isValidRecurrence('hourly')).toBe(false);
    expect(isValidRecurrence(undefined)).toBe(false);
  });
});
