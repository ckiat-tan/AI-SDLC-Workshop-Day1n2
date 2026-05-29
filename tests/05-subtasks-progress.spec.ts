import { test, expect } from './fixtures';

function futureISO(minutesAhead: number): string {
  return new Date(Date.now() + minutesAhead * 60 * 1000).toISOString();
}

test.describe('Feature 05 - Subtasks and Progress Tracking', () => {
  test('adds, updates, and deletes subtasks with correct progress math', async ({ authedRequest }) => {
    const todoResponse = await authedRequest.post('/api/todos', {
      data: { title: 'Parent todo', due_date: futureISO(120) },
    });

    const todoData = (await todoResponse.json()) as { todo: { id: number } };
    const todoId = todoData.todo.id;

    const subtaskOne = await authedRequest.post(`/api/todos/${todoId}/subtasks`, {
      data: { title: 'Step 1' },
    });
    const subtaskTwo = await authedRequest.post(`/api/todos/${todoId}/subtasks`, {
      data: { title: 'Step 2' },
    });

    expect(subtaskOne.status()).toBe(201);
    expect(subtaskTwo.status()).toBe(201);

    const subtaskOneData = (await subtaskOne.json()) as { subtask: { id: number } };

    const toggle = await authedRequest.put(`/api/subtasks/${subtaskOneData.subtask.id}`, {
      data: { is_completed: true },
    });

    expect(toggle.status()).toBe(200);

    const getTodo = await authedRequest.get(`/api/todos/${todoId}`);
    expect(getTodo.status()).toBe(200);

    const todoWithSubtasks = (await getTodo.json()) as {
      todo: { subtasks: Array<{ is_completed: boolean; id: number }> };
    };

    const subtasks = todoWithSubtasks.todo.subtasks;
    expect(subtasks.length).toBe(2);

    const completedCount = subtasks.filter((subtask) => subtask.is_completed).length;
    expect(completedCount).toBe(1);

    const deleteSubtask = await authedRequest.delete(`/api/subtasks/${subtasks[1].id}`);
    expect(deleteSubtask.status()).toBe(200);

    const afterDelete = await authedRequest.get(`/api/todos/${todoId}`);
    const afterDeleteData = (await afterDelete.json()) as {
      todo: { subtasks: Array<{ id: number }> };
    };

    expect(afterDeleteData.todo.subtasks.length).toBe(1);
  });

  test('cascade-deletes subtasks when deleting todo', async ({ authedRequest }) => {
    const todoResponse = await authedRequest.post('/api/todos', {
      data: { title: 'Cascade parent', due_date: futureISO(120) },
    });

    const todoData = (await todoResponse.json()) as { todo: { id: number } };
    const todoId = todoData.todo.id;

    const subtaskResponse = await authedRequest.post(`/api/todos/${todoId}/subtasks`, {
      data: { title: 'Cascade child' },
    });

    const subtaskData = (await subtaskResponse.json()) as { subtask: { id: number } };

    const deleteTodo = await authedRequest.delete(`/api/todos/${todoId}`);
    expect(deleteTodo.status()).toBe(200);

    const updateDeletedSubtask = await authedRequest.put(`/api/subtasks/${subtaskData.subtask.id}`, {
      data: { is_completed: true },
    });

    expect(updateDeletedSubtask.status()).toBe(404);
  });
});
