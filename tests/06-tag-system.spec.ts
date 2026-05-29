import { test, expect } from './fixtures';

function futureISO(minutesAhead: number): string {
  return new Date(Date.now() + minutesAhead * 60 * 1000).toISOString();
}

test.describe('Feature 06 - Tag System', () => {
  test('supports tag CRUD, assignment, filtering, and cleanup', async ({ authedRequest }) => {
    const tagA = await authedRequest.post('/api/tags', {
      data: { name: 'work', color: '#3B82F6' },
    });
    const tagB = await authedRequest.post('/api/tags', {
      data: { name: 'urgent', color: '#EF4444' },
    });

    expect(tagA.status()).toBe(201);
    expect(tagB.status()).toBe(201);

    const duplicate = await authedRequest.post('/api/tags', {
      data: { name: 'work', color: '#000000' },
    });
    expect(duplicate.status()).toBe(409);

    const tagAData = (await tagA.json()) as { tag: { id: number } };
    const tagBData = (await tagB.json()) as { tag: { id: number } };

    const updateTag = await authedRequest.put(`/api/tags/${tagAData.tag.id}`, {
      data: { name: 'Work', color: '#2563EB' },
    });
    expect(updateTag.status()).toBe(200);

    const todoResponse = await authedRequest.post('/api/todos', {
      data: { title: 'Tagged task', due_date: futureISO(120) },
    });
    const todoData = (await todoResponse.json()) as { todo: { id: number } };

    const assignA = await authedRequest.post(`/api/todos/${todoData.todo.id}/tags`, {
      data: { tagId: tagAData.tag.id },
    });
    const assignB = await authedRequest.post(`/api/todos/${todoData.todo.id}/tags`, {
      data: { tagId: tagBData.tag.id },
    });

    expect(assignA.status()).toBe(200);
    expect(assignB.status()).toBe(200);

    const filtered = await authedRequest.get(`/api/todos?tagId=${tagAData.tag.id}`);
    expect(filtered.status()).toBe(200);

    const filteredData = (await filtered.json()) as { todos: Array<{ id: number }> };
    expect(filteredData.todos.some((todo) => todo.id === todoData.todo.id)).toBe(true);

    const removeRelation = await authedRequest.delete(`/api/todos/${todoData.todo.id}/tags`, {
      data: { tagId: tagBData.tag.id },
    });
    expect(removeRelation.status()).toBe(200);

    const deleteTag = await authedRequest.delete(`/api/tags/${tagAData.tag.id}`);
    expect(deleteTag.status()).toBe(200);

    const getTodo = await authedRequest.get(`/api/todos/${todoData.todo.id}`);
    const getTodoData = (await getTodo.json()) as { todo: { tags: Array<{ id: number }> } };
    expect(getTodoData.todo.tags.some((tag) => tag.id === tagAData.tag.id)).toBe(false);
  });
});
