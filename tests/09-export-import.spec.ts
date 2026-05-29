import { test, expect, clearUserData } from './fixtures';

function futureISO(minutesAhead: number): string {
  return new Date(Date.now() + minutesAhead * 60 * 1000).toISOString();
}

test.describe('Feature 09 - Export and Import', () => {
  test('exports data, validates import format, and restores relationships', async ({ authedRequest, user }) => {
    const tagResponse = await authedRequest.post('/api/tags', {
      data: { name: 'backup', color: '#06B6D4' },
    });
    const tagData = (await tagResponse.json()) as { tag: { id: number } };

    const todoResponse = await authedRequest.post('/api/todos', {
      data: {
        title: 'Export me',
        due_date: futureISO(180),
        priority: 'medium',
        tagIds: [tagData.tag.id],
      },
    });

    const todoData = (await todoResponse.json()) as { todo: { id: number } };

    const subtaskResponse = await authedRequest.post(`/api/todos/${todoData.todo.id}/subtasks`, {
      data: { title: 'Export child' },
    });
    expect(subtaskResponse.status()).toBe(201);

    const exportResponse = await authedRequest.get('/api/todos/export');
    expect(exportResponse.status()).toBe(200);

    const exportPayload = (await exportResponse.json()) as {
      version: string;
      todos: unknown[];
      subtasks: unknown[];
      tags: unknown[];
      todoTags: unknown[];
    };

    expect(exportPayload.version).toBeTruthy();
    expect(exportPayload.todos.length).toBeGreaterThan(0);
    expect(exportPayload.subtasks.length).toBeGreaterThan(0);
    expect(exportPayload.tags.length).toBeGreaterThan(0);
    expect(exportPayload.todoTags.length).toBeGreaterThan(0);

    const invalidImport = await authedRequest.post('/api/todos/import', {
      data: { nope: true },
    });

    expect(invalidImport.status()).toBe(400);

    clearUserData(user.id);

    const importResponse = await authedRequest.post('/api/todos/import', {
      data: exportPayload,
    });

    expect(importResponse.status()).toBe(200);

    const importData = (await importResponse.json()) as {
      ok: boolean;
      counts: { todos: number; subtasks: number; tags: number };
    };

    expect(importData.ok).toBe(true);
    expect(importData.counts.todos).toBeGreaterThan(0);
    expect(importData.counts.subtasks).toBeGreaterThan(0);

    const listTodos = await authedRequest.get('/api/todos');
    const listTodosData = (await listTodos.json()) as {
      todos: Array<{ title: string; tags: Array<{ name: string }>; subtasks: Array<{ title: string }> }>;
    };

    expect(listTodosData.todos.some((todo) => todo.title === 'Export me')).toBe(true);
    expect(
      listTodosData.todos.some(
        (todo) =>
          todo.tags.some((tag) => tag.name.toLowerCase() === 'backup') &&
          todo.subtasks.some((subtask) => subtask.title === 'Export child'),
      ),
    ).toBe(true);

    const importAgain = await authedRequest.post('/api/todos/import', {
      data: exportPayload,
    });

    expect(importAgain.status()).toBe(200);
    const importAgainData = (await importAgain.json()) as {
      counts: { tags: number };
    };
    expect(importAgainData.counts.tags).toBe(0);
  });
});
