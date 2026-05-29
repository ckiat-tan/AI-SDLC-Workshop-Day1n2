import { test, expect } from './fixtures';

function futureISO(minutesAhead: number): string {
  return new Date(Date.now() + minutesAhead * 60 * 1000).toISOString();
}

test.describe('Feature 04 - Reminders and Notifications', () => {
  test('returns due reminder notifications once and prevents duplicates', async ({ authedRequest }) => {
    const created = await authedRequest.post('/api/todos', {
      data: {
        title: 'Reminder candidate',
        due_date: futureISO(5),
        reminder_minutes: 60,
      },
    });

    expect(created.status()).toBe(201);

    const firstCheck = await authedRequest.get('/api/notifications/check');
    expect(firstCheck.status()).toBe(200);

    const firstData = (await firstCheck.json()) as {
      notifications: Array<{ title: string; reminder_minutes: number }>;
    };

    expect(firstData.notifications.length).toBe(1);
    expect(firstData.notifications[0].title).toBe('Reminder candidate');

    const secondCheck = await authedRequest.get('/api/notifications/check');
    expect(secondCheck.status()).toBe(200);

    const secondData = (await secondCheck.json()) as {
      notifications: Array<{ title: string }>;
    };

    expect(secondData.notifications.length).toBe(0);
  });

  test('requires due date for reminders', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/todos', {
      data: {
        title: 'Reminder without due date',
        reminder_minutes: 15,
      },
    });

    expect(response.status()).toBe(400);
    const data = (await response.json()) as { error: string };
    expect(data.error).toContain('Reminder requires due date');
  });
});
