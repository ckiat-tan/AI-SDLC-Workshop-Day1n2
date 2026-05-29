import { test, expect } from './fixtures';

function futureISO(minutesAhead: number): string {
  return new Date(Date.now() + minutesAhead * 60 * 1000).toISOString();
}

test.describe('Feature 01 - Todo CRUD Operations', () => {
  test('creates, reads, updates, completes, and deletes todos', async ({ authedRequest }) => {
    const createMinimal = await authedRequest.post('/api/todos', {
      data: { title: 'Buy milk' },
    });

    expect(createMinimal.status()).toBe(201);
    const minimalData = (await createMinimal.json()) as { todo: { id: number; title: string } };
    expect(minimalData.todo.title).toBe('Buy milk');

    const createRich = await authedRequest.post('/api/todos', {
      data: {
        title: 'Prepare workshop deck',
        description: 'Finish final review',
        priority: 'high',
        due_date: futureISO(180),
        is_recurring: false,
        reminder_minutes: 60,
      },
    });

    expect(createRich.status()).toBe(201);
    const richData = (await createRich.json()) as { todo: { id: number; priority: string } };
    expect(richData.todo.priority).toBe('high');

    const listResponse = await authedRequest.get('/api/todos');
    expect(listResponse.status()).toBe(200);
    const listData = (await listResponse.json()) as { todos: Array<{ id: number }> };
    expect(listData.todos.length).toBeGreaterThanOrEqual(2);

    const getOne = await authedRequest.get(`/api/todos/${richData.todo.id}`);
    expect(getOne.status()).toBe(200);

    const update = await authedRequest.put(`/api/todos/${richData.todo.id}`, {
      data: {
        title: 'Prepare workshop deck v2',
        priority: 'medium',
      },
    });

    expect(update.status()).toBe(200);
    const updateData = (await update.json()) as { todo: { title: string; priority: string } };
    expect(updateData.todo.title).toBe('Prepare workshop deck v2');
    expect(updateData.todo.priority).toBe('medium');

    const complete = await authedRequest.put(`/api/todos/${richData.todo.id}`, {
      data: { is_completed: true },
    });

    expect(complete.status()).toBe(200);
    const completeData = (await complete.json()) as { todo: { is_completed: boolean } };
    expect(completeData.todo.is_completed).toBe(true);

    const remove = await authedRequest.delete(`/api/todos/${richData.todo.id}`);
    expect(remove.status()).toBe(200);

    const missing = await authedRequest.get(`/api/todos/${richData.todo.id}`);
    expect(missing.status()).toBe(404);
  });

  test('validates due date and required title', async ({ authedRequest }) => {
    const noTitle = await authedRequest.post('/api/todos', {
      data: { title: '   ' },
    });

    expect(noTitle.status()).toBe(400);

    const pastDue = await authedRequest.post('/api/todos', {
      data: {
        title: 'Past due invalid',
        due_date: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    });

    expect(pastDue.status()).toBe(400);
    const pastDueData = (await pastDue.json()) as { error: string };
    expect(pastDueData.error).toContain('Due date must be at least 1 minute');
  });
});
