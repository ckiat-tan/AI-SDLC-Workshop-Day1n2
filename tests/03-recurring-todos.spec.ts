import { test, expect } from './fixtures';

function futureISO(minutesAhead: number): string {
  return new Date(Date.now() + minutesAhead * 60 * 1000).toISOString();
}

test.describe('Feature 03 - Recurring Todos', () => {
  test('completing recurring todo creates the next instance with inherited metadata', async ({ authedRequest }) => {
    const dueDate = futureISO(180);

    const created = await authedRequest.post('/api/todos', {
      data: {
        title: 'Daily standup prep',
        priority: 'high',
        due_date: dueDate,
        is_recurring: true,
        recurrence_pattern: 'daily',
        reminder_minutes: 60,
      },
    });

    expect(created.status()).toBe(201);
    const createdData = (await created.json()) as { todo: { id: number; due_date: string } };

    const completed = await authedRequest.put(`/api/todos/${createdData.todo.id}`, {
      data: { is_completed: true },
    });

    expect(completed.status()).toBe(200);

    const completedData = (await completed.json()) as {
      todo: { is_completed: boolean };
      nextRecurringTodo: {
        title: string;
        priority: string;
        reminder_minutes: number;
        recurrence_pattern: string;
        due_date: string;
      } | null;
    };

    expect(completedData.todo.is_completed).toBe(true);
    expect(completedData.nextRecurringTodo).not.toBeNull();

    const next = completedData.nextRecurringTodo!;
    expect(next.title).toBe('Daily standup prep');
    expect(next.priority).toBe('high');
    expect(next.reminder_minutes).toBe(60);
    expect(next.recurrence_pattern).toBe('daily');

    const originalTime = new Date(createdData.todo.due_date).getTime();
    const nextTime = new Date(next.due_date).getTime();
    expect(nextTime - originalTime).toBe(24 * 60 * 60 * 1000);
  });

  test('validates recurring requirements', async ({ authedRequest }) => {
    const noDueDate = await authedRequest.post('/api/todos', {
      data: {
        title: 'Invalid recurring',
        is_recurring: true,
        recurrence_pattern: 'daily',
      },
    });

    expect(noDueDate.status()).toBe(400);

    const noPattern = await authedRequest.post('/api/todos', {
      data: {
        title: 'Invalid recurring 2',
        is_recurring: true,
        due_date: futureISO(180),
      },
    });

    expect(noPattern.status()).toBe(400);
  });
});
