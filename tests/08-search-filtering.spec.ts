import { test, expect } from './fixtures';

function futureISO(minutesAhead: number): string {
  return new Date(Date.now() + minutesAhead * 60 * 1000).toISOString();
}

test.describe('Feature 08 - Search and Filtering', () => {
  test('supports case-insensitive search, tag search, and combined filters with AND logic', async ({ authedRequest }) => {
    const workTagResponse = await authedRequest.post('/api/tags', {
      data: { name: 'Work', color: '#3B82F6' },
    });
    const homeTagResponse = await authedRequest.post('/api/tags', {
      data: { name: 'Home', color: '#10B981' },
    });

    const workTag = (await workTagResponse.json()) as { tag: { id: number } };
    const homeTag = (await homeTagResponse.json()) as { tag: { id: number } };

    await authedRequest.post('/api/todos', {
      data: {
        title: 'Build sprint report',
        priority: 'high',
        due_date: futureISO(120),
        tagIds: [workTag.tag.id],
      },
    });

    await authedRequest.post('/api/todos', {
      data: {
        title: 'Clean kitchen',
        priority: 'low',
        due_date: futureISO(180),
        tagIds: [homeTag.tag.id],
      },
    });

    const searchByTitle = await authedRequest.get('/api/todos?search=SPRINT');
    const searchByTitleData = (await searchByTitle.json()) as { todos: Array<{ title: string }> };
    expect(searchByTitleData.todos.length).toBe(1);
    expect(searchByTitleData.todos[0].title).toContain('sprint');

    const searchByTag = await authedRequest.get('/api/todos?search=work');
    const searchByTagData = (await searchByTag.json()) as { todos: Array<{ title: string }> };
    expect(searchByTagData.todos.length).toBe(1);
    expect(searchByTagData.todos[0].title).toContain('Build');

    const combined = await authedRequest.get(
      `/api/todos?search=build&priority=high&tagId=${workTag.tag.id}`,
    );

    const combinedData = (await combined.json()) as { todos: Array<{ title: string }> };
    expect(combinedData.todos.length).toBe(1);
    expect(combinedData.todos[0].title).toContain('Build');

    const combinedNoMatch = await authedRequest.get(
      `/api/todos?search=build&priority=low&tagId=${workTag.tag.id}`,
    );

    const combinedNoMatchData = (await combinedNoMatch.json()) as {
      todos: Array<{ title: string }>;
    };

    expect(combinedNoMatchData.todos.length).toBe(0);
  });
});
