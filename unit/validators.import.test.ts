import { describe, expect, it } from 'vitest';

import { validateExportPayload } from '../lib/validators/import';

function makeValidPayload() {
  return {
    version: '1.0.0',
    exportedAt: '2026-05-29T00:00:00.000Z',
    todos: [
      {
        id: 1,
        user_id: 1,
        title: 'One',
        description: null,
        priority: 'medium',
        due_date: null,
        is_completed: false,
        is_recurring: false,
        recurrence_pattern: null,
        reminder_minutes: null,
        last_notification_sent: null,
        created_at: '2026-05-29T00:00:00.000Z',
        updated_at: '2026-05-29T00:00:00.000Z',
      },
    ],
    subtasks: [
      {
        id: 1,
        todo_id: 1,
        title: 'Subtask',
        is_completed: false,
        position: 0,
        created_at: '2026-05-29T00:00:00.000Z',
      },
    ],
    tags: [{ id: 1, user_id: 1, name: 'work', color: '#3b82f6', created_at: '2026-05-29T00:00:00.000Z' }],
    todoTags: [{ todo_id: 1, tag_id: 1 }],
  };
}

describe('import payload validation', () => {
  it('accepts a well-formed export payload', () => {
    const payload = makeValidPayload();

    const result = validateExportPayload(payload);
    expect(result.ok).toBe(true);
    expect(result.payload).toBeTruthy();
  });

  it('rejects non-object payloads', () => {
    const result = validateExportPayload(null);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('JSON object');
  });

  it('rejects payloads missing required top-level fields', () => {
    const result = validateExportPayload({});
    expect(result.ok).toBe(false);
    expect(result.error).toContain('version');
  });

  it('rejects payloads when top-level arrays are malformed', () => {
    const missingTodos = validateExportPayload({ version: '1.0.0', subtasks: [], tags: [], todoTags: [] });
    const missingSubtasks = validateExportPayload({ version: '1.0.0', todos: [], tags: [], todoTags: [] });
    const missingTags = validateExportPayload({ version: '1.0.0', todos: [], subtasks: [], todoTags: [] });
    const missingTodoTags = validateExportPayload({ version: '1.0.0', todos: [], subtasks: [], tags: [] });

    expect(missingTodos.ok).toBe(false);
    expect(missingTodos.error).toContain('todos');
    expect(missingSubtasks.ok).toBe(false);
    expect(missingSubtasks.error).toContain('subtasks');
    expect(missingTags.ok).toBe(false);
    expect(missingTags.error).toContain('tags');
    expect(missingTodoTags.ok).toBe(false);
    expect(missingTodoTags.error).toContain('todoTags');
  });

  it('rejects malformed todo records', () => {
    const payload = makeValidPayload();
    payload.todos = [{ id: 'x', title: 123 } as unknown as (typeof payload.todos)[number]];

    const result = validateExportPayload(payload);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('todos[0]');
  });

  it('rejects malformed subtask records', () => {
    const payload = makeValidPayload();
    payload.subtasks = [{ todo_id: 'x', title: 42 } as unknown as (typeof payload.subtasks)[number]];

    const result = validateExportPayload(payload);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('subtasks[0]');
  });

  it('rejects malformed tag records', () => {
    const payload = makeValidPayload();
    payload.tags = [{ id: 'x', name: 42 } as unknown as (typeof payload.tags)[number]];

    const result = validateExportPayload(payload);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('tags[0]');
  });

  it('rejects malformed todo-tag relation records', () => {
    const payload = makeValidPayload();
    payload.todoTags = [{ todo_id: 'x', tag_id: null } as unknown as (typeof payload.todoTags)[number]];

    const result = validateExportPayload(payload);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('todoTags[0]');
  });
});
