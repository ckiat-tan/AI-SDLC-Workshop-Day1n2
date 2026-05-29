export const SINGAPORE_TIMEZONE = 'Asia/Singapore';

function extractSingaporeParts(date: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SINGAPORE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return formatter
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});
}

export function getSingaporeNow(): Date {
  const parts = extractSingaporeParts(new Date());
  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`,
  );
}

export function formatSingaporeDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat('en-SG', {
    timeZone: SINGAPORE_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function parseDateTimeLocalToSingaporeISO(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.length === 16 ? `${value}:00` : value;
  return `${normalized}+08:00`;
}

export function toDateTimeLocalFromISO(value?: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const parts = extractSingaporeParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function isAtLeastOneMinuteInFuture(value: string): boolean {
  const target = new Date(value).getTime();
  const now = getSingaporeNow().getTime();
  return target - now >= 60 * 1000;
}

export function addRecurrence(dueDateISO: string, pattern: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
  const next = new Date(dueDateISO);

  if (Number.isNaN(next.getTime())) {
    return dueDateISO;
  }

  if (pattern === 'daily') {
    next.setDate(next.getDate() + 1);
  }
  if (pattern === 'weekly') {
    next.setDate(next.getDate() + 7);
  }
  if (pattern === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  }
  if (pattern === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  }

  return next.toISOString();
}

export function toSingaporeMonthKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = extractSingaporeParts(date);
  return `${parts.year}-${parts.month}`;
}
