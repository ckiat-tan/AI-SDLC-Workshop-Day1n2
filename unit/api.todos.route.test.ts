import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const listByUserMock = vi.fn();
const createTodoMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  getSession: getSessionMock,
}));

vi.mock('@/lib/db', () => ({
  todoDB: {
    listByUser: listByUserMock,
    create: createTodoMock,
  },
}));

describe('api/todos route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated GET', async () => {
    getSessionMock.mockResolvedValue(null);
    const { GET } = await import('../app/api/todos/route');

    const response = await GET(new NextRequest('http://localhost/api/todos'));

    expect(response.status).toBe(401);
  });

  it('applies search, priority, and tag filters with AND logic', async () => {
    getSessionMock.mockResolvedValue({ userId: 42 });
    listByUserMock.mockReturnValue([
      {
        id: 1,
        title: 'Build sprint report',
        priority: 'high',
        tags: [{ id: 9, name: 'work' }],
      },
      {
        id: 2,
        title: 'Clean room',
        priority: 'low',
        tags: [{ id: 10, name: 'home' }],
      },
    ]);

    const { GET } = await import('../app/api/todos/route');
    const request = new NextRequest('http://localhost/api/todos?search=SPRINT&priority=high&tagId=9');

    const response = await GET(request as unknown as NextRequest);
    const data = (await response.json()) as { todos: Array<{ id: number; title: string }> };

    expect(response.status).toBe(200);
    expect(listByUserMock).toHaveBeenCalledWith(42);
    expect(data.todos).toHaveLength(1);
    expect(data.todos[0].title).toContain('sprint');
  });

  it('returns 400 when title is empty on POST', async () => {
    getSessionMock.mockResolvedValue({ userId: 42 });
    const { POST } = await import('../app/api/todos/route');

    const response = await POST(
      new Request('http://localhost/api/todos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: '   ' }),
      }) as unknown as NextRequest,
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when priority is invalid on POST', async () => {
    getSessionMock.mockResolvedValue({ userId: 42 });
    const { POST } = await import('../app/api/todos/route');

    const response = await POST(
      new Request('http://localhost/api/todos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Task', priority: 'urgent' }),
      }) as unknown as NextRequest,
    );

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error: string };
    expect(data.error).toContain('Invalid priority');
  });

  it('returns 400 when reminder is set without due date', async () => {
    getSessionMock.mockResolvedValue({ userId: 42 });
    const { POST } = await import('../app/api/todos/route');

    const response = await POST(
      new Request('http://localhost/api/todos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Task', reminder_minutes: 15 }),
      }) as unknown as NextRequest,
    );

    expect(response.status).toBe(400);
  });

  it('creates todo successfully on valid POST payload', async () => {
    getSessionMock.mockResolvedValue({ userId: 42 });
    createTodoMock.mockReturnValue({ id: 1001, title: 'Task', priority: 'medium' });

    const { POST } = await import('../app/api/todos/route');
    const response = await POST(
      new Request('http://localhost/api/todos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Task' }),
      }) as unknown as NextRequest,
    );

    expect(response.status).toBe(201);
    expect(createTodoMock).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        title: 'Task',
        priority: 'medium',
        is_recurring: false,
      }),
    );
  });
});
