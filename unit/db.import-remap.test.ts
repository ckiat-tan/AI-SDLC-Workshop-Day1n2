import { afterEach, describe, expect, it } from 'vitest';

import type { ExportPayload } from '../lib/db';
import { sqlite, tagDB, todoDB, userDB } from '../lib/db';

const createdUserIds: number[] = [];

function createTestUser() {
  const user = userDB.create(`unit-import-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
  createdUserIds.push(user.id);
  return user;
}

function baseTodo(id: number, title: string) {
  return {
    id,
    user_id: 999,
    title,
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
  };
}

afterEach(() => {
  for (const userId of createdUserIds.splice(0)) {
    sqlite.prepare('DELETE FROM users WHERE id = ?').run(userId);
  }
});

describe.sequential('todoDB import remap behavior', () => {
  it('imports and remaps todo/tag/subtask relationships correctly', () => {
    const user = createTestUser();

    const payload: ExportPayload = {
      version: '1.0.0',
      exportedAt: '2026-05-29T00:00:00.000Z',
      todos: [baseTodo(2001, 'Imported Todo A'), baseTodo(2002, 'Imported Todo B')],
      subtasks: [
        {
          id: 3001,
          todo_id: 2001,
          title: 'A - Subtask',
          is_completed: false,
          position: 0,
          created_at: '2026-05-29T00:00:00.000Z',
        },
      ],
      tags: [
        {
          id: 1001,
          user_id: 999,
          name: 'alpha',
          color: '#3b82f6',
          created_at: '2026-05-29T00:00:00.000Z',
        },
        {
          id: 1002,
          user_id: 999,
          name: 'beta',
          color: '#10b981',
          created_at: '2026-05-29T00:00:00.000Z',
        },
      ],
      todoTags: [
        { todo_id: 2001, tag_id: 1001 },
        { todo_id: 2002, tag_id: 1002 },
      ],
    };

    const counts = todoDB.import(user.id, payload);

    expect(counts).toEqual({ todos: 2, subtasks: 1, tags: 2 });

    const todos = todoDB.listByUser(user.id);
    expect(todos).toHaveLength(2);

    const todoA = todos.find((todo) => todo.title === 'Imported Todo A');
    const todoB = todos.find((todo) => todo.title === 'Imported Todo B');

    expect(todoA).toBeTruthy();
    expect(todoA?.subtasks.some((subtask) => subtask.title === 'A - Subtask')).toBe(true);
    expect(todoA?.tags.some((tag) => tag.name === 'alpha')).toBe(true);

    expect(todoB).toBeTruthy();
    expect(todoB?.tags.some((tag) => tag.name === 'beta')).toBe(true);
  });

  it('reuses existing tags by case-insensitive name during import', () => {
    const user = createTestUser();
    tagDB.create(user.id, 'Work', '#111111');

    const payload: ExportPayload = {
      version: '1.0.0',
      exportedAt: '2026-05-29T00:00:00.000Z',
      todos: [baseTodo(2101, 'Todo with existing tag')],
      subtasks: [],
      tags: [
        {
          id: 1101,
          user_id: 999,
          name: 'work',
          color: '#222222',
          created_at: '2026-05-29T00:00:00.000Z',
        },
        {
          id: 1102,
          user_id: 999,
          name: 'new-tag',
          color: '#333333',
          created_at: '2026-05-29T00:00:00.000Z',
        },
      ],
      todoTags: [
        { todo_id: 2101, tag_id: 1101 },
        { todo_id: 2101, tag_id: 1102 },
      ],
    };

    const counts = todoDB.import(user.id, payload);
    expect(counts.tags).toBe(1);

    const tags = tagDB.listByUser(user.id);
    expect(tags.filter((tag) => tag.name.toLowerCase() === 'work')).toHaveLength(1);
    expect(tags.some((tag) => tag.name === 'new-tag')).toBe(true);

    const todos = todoDB.listByUser(user.id);
    expect(todos).toHaveLength(1);
    expect(todos[0].tags).toHaveLength(2);
  });

  it('skips invalid mapped relations without failing the import', () => {
    const user = createTestUser();

    const payload: ExportPayload = {
      version: '1.0.0',
      exportedAt: '2026-05-29T00:00:00.000Z',
      todos: [baseTodo(2201, 'Todo with dangling rels')],
      subtasks: [
        {
          id: 3201,
          todo_id: 999999,
          title: 'Orphan subtask',
          is_completed: false,
          position: 0,
          created_at: '2026-05-29T00:00:00.000Z',
        },
      ],
      tags: [
        {
          id: 1201,
          user_id: 999,
          name: 'x',
          color: '#000000',
          created_at: '2026-05-29T00:00:00.000Z',
        },
      ],
      todoTags: [
        { todo_id: 2201, tag_id: 1201 },
        { todo_id: 999999, tag_id: 1201 },
        { todo_id: 2201, tag_id: 999999 },
      ],
    };

    const counts = todoDB.import(user.id, payload);
    expect(counts).toEqual({ todos: 1, subtasks: 0, tags: 1 });

    const todos = todoDB.listByUser(user.id);
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Todo with dangling rels');
    expect(todos[0].subtasks).toHaveLength(0);
    expect(todos[0].tags).toHaveLength(1);
  });
});
