import { test, expect } from './fixtures';

function futureISO(minutesAhead: number): string {
  return new Date(Date.now() + minutesAhead * 60 * 1000).toISOString();
}

test.describe('Feature 07 - Template System', () => {
  test('saves template from todo, uses template, updates, and deletes template', async ({ authedRequest }) => {
    const tagResponse = await authedRequest.post('/api/tags', {
      data: { name: 'meeting', color: '#22C55E' },
    });
    const tagData = (await tagResponse.json()) as { tag: { id: number } };

    const todoResponse = await authedRequest.post('/api/todos', {
      data: {
        title: 'Prepare retrospective',
        priority: 'high',
        due_date: futureISO(180),
        is_recurring: true,
        recurrence_pattern: 'weekly',
        reminder_minutes: 60,
        tagIds: [tagData.tag.id],
      },
    });

    expect(todoResponse.status()).toBe(201);
    const todoData = (await todoResponse.json()) as { todo: { id: number } };

    await authedRequest.post(`/api/todos/${todoData.todo.id}/subtasks`, {
      data: { title: 'Collect metrics' },
    });

    const createTemplate = await authedRequest.post('/api/templates', {
      data: {
        todoId: todoData.todo.id,
        name: 'Retrospective Template',
        description: 'Weekly retros template',
        category: 'work',
      },
    });

    expect(createTemplate.status()).toBe(201);
    const templateData = (await createTemplate.json()) as { template: { id: number; name: string } };
    expect(templateData.template.name).toBe('Retrospective Template');

    const useTemplate = await authedRequest.post(`/api/templates/${templateData.template.id}/use`);
    expect(useTemplate.status()).toBe(201);

    const usedTodoData = (await useTemplate.json()) as {
      todo: {
        id: number;
        title: string;
        priority: string;
        recurrence_pattern: string;
      };
    };

    expect(usedTodoData.todo.title).toBe('Prepare retrospective');
    expect(usedTodoData.todo.priority).toBe('high');
    expect(usedTodoData.todo.recurrence_pattern).toBe('weekly');

    const getUsedTodo = await authedRequest.get(`/api/todos/${usedTodoData.todo.id}`);
    const getUsedTodoData = (await getUsedTodo.json()) as {
      todo: { subtasks: Array<{ title: string }>; tags: Array<{ name: string }> };
    };

    expect(getUsedTodoData.todo.subtasks.length).toBeGreaterThan(0);
    expect(getUsedTodoData.todo.tags.some((tag) => tag.name.toLowerCase() === 'meeting')).toBe(true);

    const updateTemplate = await authedRequest.put(`/api/templates/${templateData.template.id}`, {
      data: {
        name: 'Retrospective Template v2',
        category: 'team',
      },
    });

    expect(updateTemplate.status()).toBe(200);

    const deleteTemplate = await authedRequest.delete(`/api/templates/${templateData.template.id}`);
    expect(deleteTemplate.status()).toBe(200);

    const listTemplates = await authedRequest.get('/api/templates');
    const listData = (await listTemplates.json()) as { templates: Array<{ id: number }> };
    expect(listData.templates.some((template) => template.id === templateData.template.id)).toBe(false);
  });
});
