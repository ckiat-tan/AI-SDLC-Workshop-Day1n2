import { test, expect } from './fixtures';

function futureISO(minutesAhead: number): string {
  return new Date(Date.now() + minutesAhead * 60 * 1000).toISOString();
}

test.describe('Feature 02 - Priority System', () => {
  test('creates todos with all priorities and sorts high to low', async ({ authedRequest }) => {
    await authedRequest.post('/api/todos', {
      data: { title: 'Low item', priority: 'low', due_date: futureISO(200) },
    });

    await authedRequest.post('/api/todos', {
      data: { title: 'High item', priority: 'high', due_date: futureISO(220) },
    });

    await authedRequest.post('/api/todos', {
      data: { title: 'Medium item', priority: 'medium', due_date: futureISO(240) },
    });

    const list = await authedRequest.get('/api/todos');
    expect(list.status()).toBe(200);

    const data = (await list.json()) as { todos: Array<{ title: string; priority: string }> };
    const priorities = data.todos.map((todo) => todo.priority);

    expect(priorities[0]).toBe('high');
    expect(priorities[1]).toBe('medium');
    expect(priorities[2]).toBe('low');
  });

  test('filters by priority and supports priority updates', async ({ authedRequest }) => {
    const created = await authedRequest.post('/api/todos', {
      data: {
        title: 'Escalate me',
        priority: 'low',
        due_date: futureISO(120),
      },
    });

    const createData = (await created.json()) as { todo: { id: number } };

    const updated = await authedRequest.put(`/api/todos/${createData.todo.id}`, {
      data: {
        priority: 'high',
      },
    });

    expect(updated.status()).toBe(200);

    const filtered = await authedRequest.get('/api/todos?priority=high');
    expect(filtered.status()).toBe(200);

    const filteredData = (await filtered.json()) as {
      todos: Array<{ id: number; priority: string }>;
    };

    expect(filteredData.todos.some((todo) => todo.id === createData.todo.id)).toBe(true);
    expect(filteredData.todos.every((todo) => todo.priority === 'high')).toBe(true);
  });
});
