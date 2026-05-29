import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const importMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  getSession: getSessionMock,
}));

vi.mock('@/lib/db', () => ({
  todoDB: {
    import: importMock,
  },
}));

describe('api/todos/import route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated requests', async () => {
    getSessionMock.mockResolvedValue(null);
    const { POST } = await import('../app/api/todos/import/route');

    const response = await POST(
      new Request('http://localhost/api/todos/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }) as unknown as NextRequest,
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid JSON payload', async () => {
    getSessionMock.mockResolvedValue({ userId: 42 });
    const { POST } = await import('../app/api/todos/import/route');

    const response = await POST(
      new Request('http://localhost/api/todos/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{bad-json',
      }) as unknown as NextRequest,
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for structurally invalid import payload', async () => {
    getSessionMock.mockResolvedValue({ userId: 42 });
    const { POST } = await import('../app/api/todos/import/route');

    const response = await POST(
      new Request('http://localhost/api/todos/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version: '1.0.0' }),
      }) as unknown as NextRequest,
    );

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error: string };
    expect(data.error).toContain('Invalid import format');
  });

  it('imports valid payload and returns success', async () => {
    getSessionMock.mockResolvedValue({ userId: 42 });
    importMock.mockReturnValue({ todos: 1, subtasks: 2, tags: 0 });

    const { POST } = await import('../app/api/todos/import/route');

    const response = await POST(
      new Request('http://localhost/api/todos/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          version: '1.0.0',
          todos: [],
          subtasks: [],
          tags: [],
          todoTags: [],
        }),
      }) as unknown as NextRequest,
    );

    expect(response.status).toBe(200);
    expect(importMock).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ version: '1.0.0' }),
    );
  });

  it('returns 500 when import operation throws', async () => {
    getSessionMock.mockResolvedValue({ userId: 42 });
    importMock.mockImplementation(() => {
      throw new Error('db unavailable');
    });

    const { POST } = await import('../app/api/todos/import/route');

    const response = await POST(
      new Request('http://localhost/api/todos/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          version: '1.0.0',
          todos: [],
          subtasks: [],
          tags: [],
          todoTags: [],
        }),
      }) as unknown as NextRequest,
    );

    expect(response.status).toBe(500);
  });
});
