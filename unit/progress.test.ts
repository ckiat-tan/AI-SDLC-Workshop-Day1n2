import { describe, expect, it } from 'vitest';

import { calculateSubtaskProgress } from '../lib/progress';

describe('progress utility', () => {
  it('returns zero progress for empty subtasks', () => {
    expect(calculateSubtaskProgress([])).toEqual({
      completed: 0,
      total: 0,
      percent: 0,
    });
  });

  it('calculates rounded completion percentage', () => {
    expect(
      calculateSubtaskProgress([
        { is_completed: true },
        { is_completed: true },
        { is_completed: false },
      ]),
    ).toEqual({
      completed: 2,
      total: 3,
      percent: 67,
    });
  });
});
