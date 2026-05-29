import type { Priority, RecurrencePattern } from '@/lib/db';

export function isValidPriority(value: unknown): value is Priority {
  return value === 'high' || value === 'medium' || value === 'low';
}

export function isValidRecurrence(value: unknown): value is RecurrencePattern {
  return value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly';
}
