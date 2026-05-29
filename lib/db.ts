import Database from 'better-sqlite3';
import path from 'node:path';

import { getSingaporeNow } from '@/lib/timezone';

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type User = {
  id: number;
  username: string;
  created_at: string;
};

export type Authenticator = {
  id: number;
  user_id: number;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  created_at: string;
};

export type Tag = {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
};

export type Subtask = {
  id: number;
  todo_id: number;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
};

export type Todo = {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  priority: Priority;
  due_date: string | null;
  is_completed: boolean;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  subtasks: Subtask[];
};

export type TemplateSubtask = {
  title: string;
  position: number;
};

export type Template = {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  title: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  due_offset_days: number | null;
  subtasks_json: string;
  tag_names_json: string;
  created_at: string;
  updated_at: string;
};

export type Holiday = {
  id: number;
  date: string;
  name: string;
};

export type TodoInput = {
  title: string;
  description?: string | null;
  priority?: Priority;
  due_date?: string | null;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  tagIds?: number[];
};

export type TemplateInput = {
  name: string;
  description?: string | null;
  category?: string | null;
  title: string;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  due_offset_days?: number | null;
  subtasks?: TemplateSubtask[];
  tagNames?: string[];
};

export type ExportPayload = {
  version: string;
  exportedAt: string;
  todos: Omit<Todo, 'tags' | 'subtasks'>[];
  subtasks: Subtask[];
  tags: Tag[];
  todoTags: Array<{ todo_id: number; tag_id: number }>;
};

const dbPath = path.join(process.cwd(), 'todos.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function nowISO(): string {
  return getSingaporeNow().toISOString();
}

function normalizePriority(value?: string | null): Priority {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
}

function normalizeRecurrence(value?: string | null): RecurrencePattern | null {
  if (value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly') {
    return value;
  }
  return null;
}

function boolToDb(value?: boolean): number {
  return value ? 1 : 0;
}

function dbToBool(value: unknown): boolean {
  return value === 1 || value === true;
}

function mapSubtaskRow(row: Record<string, unknown>): Subtask {
  return {
    id: Number(row.id),
    todo_id: Number(row.todo_id),
    title: String(row.title ?? ''),
    is_completed: dbToBool(row.is_completed),
    position: Number(row.position ?? 0),
    created_at: String(row.created_at ?? ''),
  };
}

function mapTagRow(row: Record<string, unknown>): Tag {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    name: String(row.name ?? ''),
    color: String(row.color ?? '#3b82f6'),
    created_at: String(row.created_at ?? ''),
  };
}

function mapTodoRow(row: Record<string, unknown>, tags: Tag[] = [], subtasks: Subtask[] = []): Todo {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    title: String(row.title ?? ''),
    description: row.description ? String(row.description) : null,
    priority: normalizePriority(String(row.priority ?? 'medium')),
    due_date: row.due_date ? String(row.due_date) : null,
    is_completed: dbToBool(row.is_completed),
    is_recurring: dbToBool(row.is_recurring),
    recurrence_pattern: normalizeRecurrence(row.recurrence_pattern ? String(row.recurrence_pattern) : null),
    reminder_minutes: row.reminder_minutes === null || row.reminder_minutes === undefined ? null : Number(row.reminder_minutes),
    last_notification_sent: row.last_notification_sent ? String(row.last_notification_sent) : null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    tags,
    subtasks,
  };
}

function mapTemplateRow(row: Record<string, unknown>): Template {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    name: String(row.name ?? ''),
    description: row.description ? String(row.description) : null,
    category: row.category ? String(row.category) : null,
    title: String(row.title ?? ''),
    priority: normalizePriority(String(row.priority ?? 'medium')),
    is_recurring: dbToBool(row.is_recurring),
    recurrence_pattern: normalizeRecurrence(row.recurrence_pattern ? String(row.recurrence_pattern) : null),
    reminder_minutes: row.reminder_minutes === null || row.reminder_minutes === undefined ? null : Number(row.reminder_minutes),
    due_offset_days: row.due_offset_days === null || row.due_offset_days === undefined ? null : Number(row.due_offset_days),
    subtasks_json: String(row.subtasks_json ?? '[]'),
    tag_names_json: String(row.tag_names_json ?? '[]'),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

function getTagsByTodoIds(todoIds: number[]): Map<number, Tag[]> {
  const grouped = new Map<number, Tag[]>();

  if (todoIds.length === 0) {
    return grouped;
  }

  for (const todoId of todoIds) {
    grouped.set(todoId, []);
  }

  const placeholders = todoIds.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `
      SELECT t.*, tt.todo_id
      FROM tags t
      INNER JOIN todo_tags tt ON tt.tag_id = t.id
      WHERE tt.todo_id IN (${placeholders})
      ORDER BY t.name COLLATE NOCASE ASC
    `,
    )
    .all(...todoIds) as Record<string, unknown>[];

  for (const row of rows) {
    const todoId = Number(row.todo_id);
    const tags = grouped.get(todoId);
    if (!tags) {
      continue;
    }

    tags.push(mapTagRow(row));
  }

  return grouped;
}

function getSubtasksByTodoIds(todoIds: number[]): Map<number, Subtask[]> {
  const grouped = new Map<number, Subtask[]>();

  if (todoIds.length === 0) {
    return grouped;
  }

  for (const todoId of todoIds) {
    grouped.set(todoId, []);
  }

  const placeholders = todoIds.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `
      SELECT *
      FROM subtasks
      WHERE todo_id IN (${placeholders})
      ORDER BY position ASC, id ASC
    `,
    )
    .all(...todoIds) as Record<string, unknown>[];

  for (const row of rows) {
    const todoId = Number(row.todo_id);
    const subtasks = grouped.get(todoId);
    if (!subtasks) {
      continue;
    }

    subtasks.push(mapSubtaskRow(row));
  }

  return grouped;
}

function hydrateTodos(rows: Record<string, unknown>[]): Todo[] {
  if (rows.length === 0) {
    return [];
  }

  const todoIds = rows.map((row) => Number(row.id));
  const tagsByTodoId = getTagsByTodoIds(todoIds);
  const subtasksByTodoId = getSubtasksByTodoIds(todoIds);

  return rows.map((row) => {
    const todoId = Number(row.id);
    return mapTodoRow(row, tagsByTodoId.get(todoId) ?? [], subtasksByTodoId.get(todoId) ?? []);
  });
}

function getTagsForTodo(todoId: number): Tag[] {
  return getTagsByTodoIds([todoId]).get(todoId) ?? [];
}

function getSubtasksForTodo(todoId: number): Subtask[] {
  return getSubtasksByTodoIds([todoId]).get(todoId) ?? [];
}

function getTodoRowById(userId: number, todoId: number): Record<string, unknown> | null {
  const row = db
    .prepare(
      `
      SELECT *
      FROM todos
      WHERE id = ? AND user_id = ?
    `,
    )
    .get(todoId, userId) as Record<string, unknown> | undefined;

  return row ?? null;
}

function hydrateTodo(row: Record<string, unknown>): Todo {
  return hydrateTodos([row])[0];
}

function ensureSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS authenticators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      transports TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      is_completed INTEGER NOT NULL DEFAULT 0,
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurrence_pattern TEXT,
      reminder_minutes INTEGER,
      last_notification_sent TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      todo_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      created_at TEXT NOT NULL,
      UNIQUE(user_id, name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS todo_tags (
      todo_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (todo_id, tag_id),
      FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      title TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurrence_pattern TEXT,
      reminder_minutes INTEGER,
      due_offset_days INTEGER,
      subtasks_json TEXT NOT NULL DEFAULT '[]',
      tag_names_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);
    CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
    CREATE INDEX IF NOT EXISTS idx_todos_user_completed_due ON todos(user_id, is_completed, due_date);
    CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);
    CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
    CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
    CREATE INDEX IF NOT EXISTS idx_todo_tags_todo_id ON todo_tags(todo_id);
    CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);
  `);
}

const SINGAPORE_HOLIDAYS: Array<{ date: string; name: string }> = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-17', name: 'Chinese New Year (Day 1)' },
  { date: '2026-02-18', name: 'Chinese New Year (Day 2)' },
  { date: '2026-03-20', name: 'Hari Raya Puasa' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-31', name: 'Vesak Day' },
  { date: '2026-07-20', name: 'Hari Raya Haji' },
  { date: '2026-08-09', name: 'National Day' },
  { date: '2026-11-08', name: 'Deepavali' },
  { date: '2026-12-25', name: 'Christmas Day' },
];

function seedHolidays(): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM holidays').get() as { count: number };
  if (count.count > 0) {
    return;
  }

  const insert = db.prepare('INSERT OR IGNORE INTO holidays (date, name) VALUES (?, ?)');
  const transaction = db.transaction(() => {
    for (const holiday of SINGAPORE_HOLIDAYS) {
      insert.run(holiday.date, holiday.name);
    }
  });

  transaction();
}

ensureSchema();
seedHolidays();

export const userDB = {
  getByUsername(username: string): User | null {
    const row = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(username.trim()) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      username: String(row.username ?? ''),
      created_at: String(row.created_at ?? ''),
    };
  },

  getById(id: number): User | null {
    const row = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      username: String(row.username ?? ''),
      created_at: String(row.created_at ?? ''),
    };
  },

  create(username: string): User {
    const trimmed = username.trim();
    const createdAt = nowISO();

    const result = db
      .prepare('INSERT INTO users (username, created_at) VALUES (?, ?)')
      .run(trimmed, createdAt);

    return {
      id: Number(result.lastInsertRowid),
      username: trimmed,
      created_at: createdAt,
    };
  },
};

export const authenticatorDB = {
  create(input: {
    userId: number;
    credentialId: string;
    publicKey: string;
    counter?: number;
    transports?: string[];
  }): Authenticator {
    const createdAt = nowISO();

    const result = db
      .prepare(
        `
        INSERT INTO authenticators (
          user_id,
          credential_id,
          public_key,
          counter,
          transports,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        input.userId,
        input.credentialId,
        input.publicKey,
        input.counter ?? 0,
        input.transports ? JSON.stringify(input.transports) : null,
        createdAt,
      );

    const row = db
      .prepare('SELECT * FROM authenticators WHERE id = ?')
      .get(result.lastInsertRowid) as Record<string, unknown>;

    return {
      id: Number(row.id),
      user_id: Number(row.user_id),
      credential_id: String(row.credential_id ?? ''),
      public_key: String(row.public_key ?? ''),
      counter: Number(row.counter ?? 0),
      transports: row.transports ? String(row.transports) : null,
      created_at: String(row.created_at ?? ''),
    };
  },

  listByUserId(userId: number): Authenticator[] {
    const rows = db
      .prepare('SELECT * FROM authenticators WHERE user_id = ? ORDER BY id ASC')
      .all(userId) as Record<string, unknown>[];

    return rows.map((row) => ({
      id: Number(row.id),
      user_id: Number(row.user_id),
      credential_id: String(row.credential_id ?? ''),
      public_key: String(row.public_key ?? ''),
      counter: Number(row.counter ?? 0),
      transports: row.transports ? String(row.transports) : null,
      created_at: String(row.created_at ?? ''),
    }));
  },

  getByCredentialId(credentialId: string): Authenticator | null {
    const row = db
      .prepare('SELECT * FROM authenticators WHERE credential_id = ?')
      .get(credentialId) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      user_id: Number(row.user_id),
      credential_id: String(row.credential_id ?? ''),
      public_key: String(row.public_key ?? ''),
      counter: Number(row.counter ?? 0),
      transports: row.transports ? String(row.transports) : null,
      created_at: String(row.created_at ?? ''),
    };
  },

  updateCounter(id: number, counter: number): void {
    db.prepare('UPDATE authenticators SET counter = ? WHERE id = ?').run(counter, id);
  },
};

export const todoDB = {
  listByUser(userId: number): Todo[] {
    const rows = db
      .prepare(
        `
        SELECT *
        FROM todos
        WHERE user_id = ?
        ORDER BY
          CASE priority
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            ELSE 3
          END ASC,
          CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC,
          due_date ASC,
          id DESC
      `,
      )
      .all(userId) as Record<string, unknown>[];

    return hydrateTodos(rows);
  },

  getById(userId: number, todoId: number): Todo | null {
    const row = getTodoRowById(userId, todoId);
    if (!row) {
      return null;
    }

    return hydrateTodo(row);
  },

  create(userId: number, input: TodoInput): Todo {
    const title = input.title.trim();
    const now = nowISO();

    const result = db
      .prepare(
        `
        INSERT INTO todos (
          user_id,
          title,
          description,
          priority,
          due_date,
          is_completed,
          is_recurring,
          recurrence_pattern,
          reminder_minutes,
          last_notification_sent,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, ?, ?)
      `,
      )
      .run(
        userId,
        title,
        input.description?.trim() || null,
        normalizePriority(input.priority),
        input.due_date || null,
        boolToDb(input.is_recurring),
        normalizeRecurrence(input.recurrence_pattern) || null,
        input.reminder_minutes ?? null,
        now,
        now,
      );

    const todoId = Number(result.lastInsertRowid);

    if (input.tagIds?.length) {
      const insertTag = db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
      const transaction = db.transaction((tagIds: number[]) => {
        for (const tagId of tagIds) {
          insertTag.run(todoId, tagId);
        }
      });
      transaction(input.tagIds);
    }

    const created = this.getById(userId, todoId);
    if (!created) {
      throw new Error('Failed to create todo');
    }

    return created;
  },

  update(userId: number, todoId: number, input: TodoInput): Todo | null {
    const existing = getTodoRowById(userId, todoId);
    if (!existing) {
      return null;
    }

    const now = nowISO();
    const title = input.title?.trim() || String(existing.title ?? '').trim();

    db.prepare(
      `
      UPDATE todos
      SET
        title = ?,
        description = ?,
        priority = ?,
        due_date = ?,
        is_recurring = ?,
        recurrence_pattern = ?,
        reminder_minutes = ?,
        updated_at = ?
      WHERE id = ? AND user_id = ?
    `,
    ).run(
      title,
      input.description === undefined ? (existing.description as string | null) : (input.description?.trim() || null),
      input.priority === undefined ? normalizePriority(String(existing.priority ?? 'medium')) : normalizePriority(input.priority),
      input.due_date === undefined ? (existing.due_date as string | null) : (input.due_date || null),
      input.is_recurring === undefined ? Number(existing.is_recurring ?? 0) : boolToDb(input.is_recurring),
      input.recurrence_pattern === undefined
        ? normalizeRecurrence(existing.recurrence_pattern ? String(existing.recurrence_pattern) : null)
        : normalizeRecurrence(input.recurrence_pattern),
      input.reminder_minutes === undefined ? (existing.reminder_minutes as number | null) : input.reminder_minutes,
      now,
      todoId,
      userId,
    );

    if (input.tagIds) {
      db.prepare('DELETE FROM todo_tags WHERE todo_id = ?').run(todoId);
      const insertTag = db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
      const transaction = db.transaction((tagIds: number[]) => {
        for (const tagId of tagIds) {
          insertTag.run(todoId, tagId);
        }
      });
      transaction(input.tagIds);
    }

    return this.getById(userId, todoId);
  },

  updateCompletion(userId: number, todoId: number, completed: boolean): Todo | null {
    const now = nowISO();
    db.prepare('UPDATE todos SET is_completed = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(
      boolToDb(completed),
      now,
      todoId,
      userId,
    );

    return this.getById(userId, todoId);
  },

  delete(userId: number, todoId: number): boolean {
    const result = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(todoId, userId);
    return result.changes > 0;
  },

  createRecurringInstance(userId: number, todo: Todo, nextDueDate: string): Todo {
    const created = this.create(userId, {
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      due_date: nextDueDate,
      is_recurring: true,
      recurrence_pattern: todo.recurrence_pattern,
      reminder_minutes: todo.reminder_minutes,
      tagIds: todo.tags.map((tag) => tag.id),
    });

    for (const subtask of todo.subtasks) {
      subtaskDB.create(userId, created.id, subtask.title, subtask.position);
    }

    const refreshed = this.getById(userId, created.id);
    if (!refreshed) {
      throw new Error('Failed to create recurring instance');
    }

    return refreshed;
  },

  listForNotifications(userId: number): Todo[] {
    const rows = db
      .prepare(
        `
        SELECT *
        FROM todos
        WHERE user_id = ?
          AND is_completed = 0
          AND due_date IS NOT NULL
          AND reminder_minutes IS NOT NULL
      `,
      )
      .all(userId) as Record<string, unknown>[];

    return hydrateTodos(rows);
  },

  markNotificationSent(userId: number, todoId: number, sentAt: string): void {
    db.prepare('UPDATE todos SET last_notification_sent = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(
      sentAt,
      sentAt,
      todoId,
      userId,
    );
  },

  export(userId: number): ExportPayload {
    const todos = db
      .prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY id ASC')
      .all(userId) as Omit<Todo, 'tags' | 'subtasks'>[];

    const subtasks = db
      .prepare(
        `
        SELECT s.*
        FROM subtasks s
        INNER JOIN todos t ON t.id = s.todo_id
        WHERE t.user_id = ?
        ORDER BY s.id ASC
      `,
      )
      .all(userId) as Subtask[];

    const tags = db
      .prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY id ASC')
      .all(userId) as Tag[];

    const todoTags = db
      .prepare(
        `
        SELECT tt.todo_id, tt.tag_id
        FROM todo_tags tt
        INNER JOIN todos t ON t.id = tt.todo_id
        WHERE t.user_id = ?
      `,
      )
      .all(userId) as Array<{ todo_id: number; tag_id: number }>;

    return {
      version: '1.0.0',
      exportedAt: nowISO(),
      todos,
      subtasks,
      tags,
      todoTags,
    };
  },

  import(userId: number, payload: ExportPayload): { todos: number; subtasks: number; tags: number } {
    const tagIdMap = new Map<number, number>();
    const todoIdMap = new Map<number, number>();
    let importedTags = 0;
    let importedTodos = 0;
    let importedSubtasks = 0;

    const insertTag = db.prepare('INSERT INTO tags (user_id, name, color, created_at) VALUES (?, ?, ?, ?)');
    const findTagByName = db.prepare('SELECT id FROM tags WHERE user_id = ? AND LOWER(name) = LOWER(?)');

    const insertTodo = db.prepare(
      `
      INSERT INTO todos (
        user_id,
        title,
        description,
        priority,
        due_date,
        is_completed,
        is_recurring,
        recurrence_pattern,
        reminder_minutes,
        last_notification_sent,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    );

    const insertSubtask = db.prepare(
      `
      INSERT INTO subtasks (todo_id, title, is_completed, position, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    );

    const insertTodoTag = db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');

    const transaction = db.transaction(() => {
      for (const incomingTag of payload.tags ?? []) {
        const existing = findTagByName.get(userId, incomingTag.name) as { id: number } | undefined;

        if (existing) {
          tagIdMap.set(incomingTag.id, existing.id);
          continue;
        }

        const createdAt = incomingTag.created_at || nowISO();
        const result = insertTag.run(userId, incomingTag.name.trim(), incomingTag.color || '#3b82f6', createdAt);
        const newId = Number(result.lastInsertRowid);
        tagIdMap.set(incomingTag.id, newId);
        importedTags += 1;
      }

      for (const incomingTodo of payload.todos ?? []) {
        const createdAt = incomingTodo.created_at || nowISO();
        const updatedAt = incomingTodo.updated_at || createdAt;

        const todoResult = insertTodo.run(
          userId,
          incomingTodo.title,
          incomingTodo.description || null,
          normalizePriority(incomingTodo.priority),
          incomingTodo.due_date || null,
          boolToDb(incomingTodo.is_completed),
          boolToDb(incomingTodo.is_recurring),
          normalizeRecurrence(incomingTodo.recurrence_pattern),
          incomingTodo.reminder_minutes ?? null,
          incomingTodo.last_notification_sent || null,
          createdAt,
          updatedAt,
        );

        const newTodoId = Number(todoResult.lastInsertRowid);
        todoIdMap.set(incomingTodo.id, newTodoId);
        importedTodos += 1;
      }

      for (const incomingSubtask of payload.subtasks ?? []) {
        const mappedTodoId = todoIdMap.get(incomingSubtask.todo_id);
        if (!mappedTodoId) {
          continue;
        }

        insertSubtask.run(
          mappedTodoId,
          incomingSubtask.title,
          boolToDb(incomingSubtask.is_completed),
          incomingSubtask.position ?? 0,
          incomingSubtask.created_at || nowISO(),
        );

        importedSubtasks += 1;
      }

      for (const rel of payload.todoTags ?? []) {
        const mappedTodoId = todoIdMap.get(rel.todo_id);
        const mappedTagId = tagIdMap.get(rel.tag_id);

        if (!mappedTodoId || !mappedTagId) {
          continue;
        }

        insertTodoTag.run(mappedTodoId, mappedTagId);
      }
    });

    transaction();

    return {
      todos: importedTodos,
      subtasks: importedSubtasks,
      tags: importedTags,
    };
  },
};

export const subtaskDB = {
  create(userId: number, todoId: number, title: string, position?: number): Subtask {
    const todo = getTodoRowById(userId, todoId);
    if (!todo) {
      throw new Error('Todo not found');
    }

    const nextPositionRow = db
      .prepare('SELECT COALESCE(MAX(position), -1) as max_position FROM subtasks WHERE todo_id = ?')
      .get(todoId) as { max_position: number };

    const resolvedPosition = position ?? nextPositionRow.max_position + 1;
    const createdAt = nowISO();

    const result = db
      .prepare('INSERT INTO subtasks (todo_id, title, is_completed, position, created_at) VALUES (?, ?, 0, ?, ?)')
      .run(todoId, title.trim(), resolvedPosition, createdAt);

    const row = db
      .prepare('SELECT * FROM subtasks WHERE id = ?')
      .get(result.lastInsertRowid) as Record<string, unknown>;

    return mapSubtaskRow(row);
  },

  update(userId: number, subtaskId: number, input: { title?: string; is_completed?: boolean }): Subtask | null {
    const existing = db
      .prepare(
        `
        SELECT s.*
        FROM subtasks s
        INNER JOIN todos t ON t.id = s.todo_id
        WHERE s.id = ? AND t.user_id = ?
      `,
      )
      .get(subtaskId, userId) as Record<string, unknown> | undefined;

    if (!existing) {
      return null;
    }

    db.prepare(
      `
      UPDATE subtasks
      SET
        title = ?,
        is_completed = ?
      WHERE id = ?
    `,
    ).run(
      input.title === undefined ? String(existing.title ?? '') : input.title.trim(),
      input.is_completed === undefined ? Number(existing.is_completed ?? 0) : boolToDb(input.is_completed),
      subtaskId,
    );

    const updated = db
      .prepare('SELECT * FROM subtasks WHERE id = ?')
      .get(subtaskId) as Record<string, unknown>;

    return mapSubtaskRow(updated);
  },

  delete(userId: number, subtaskId: number): boolean {
    const result = db
      .prepare(
        `
        DELETE FROM subtasks
        WHERE id = ?
          AND todo_id IN (SELECT id FROM todos WHERE user_id = ?)
      `,
      )
      .run(subtaskId, userId);

    return result.changes > 0;
  },
};

export const tagDB = {
  listByUser(userId: number): Tag[] {
    const rows = db
      .prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC')
      .all(userId) as Record<string, unknown>[];

    return rows.map(mapTagRow);
  },

  create(userId: number, name: string, color: string): Tag {
    const createdAt = nowISO();
    const result = db
      .prepare('INSERT INTO tags (user_id, name, color, created_at) VALUES (?, ?, ?, ?)')
      .run(userId, name.trim(), color, createdAt);

    const row = db
      .prepare('SELECT * FROM tags WHERE id = ?')
      .get(result.lastInsertRowid) as Record<string, unknown>;

    return mapTagRow(row);
  },

  update(userId: number, tagId: number, name: string, color: string): Tag | null {
    const result = db
      .prepare('UPDATE tags SET name = ?, color = ? WHERE id = ? AND user_id = ?')
      .run(name.trim(), color, tagId, userId);

    if (result.changes === 0) {
      return null;
    }

    const row = db
      .prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?')
      .get(tagId, userId) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return mapTagRow(row);
  },

  delete(userId: number, tagId: number): boolean {
    const result = db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(tagId, userId);
    return result.changes > 0;
  },

  assignToTodo(userId: number, todoId: number, tagId: number): boolean {
    const todo = getTodoRowById(userId, todoId);
    if (!todo) {
      return false;
    }

    const tag = db.prepare('SELECT id FROM tags WHERE id = ? AND user_id = ?').get(tagId, userId) as
      | { id: number }
      | undefined;

    if (!tag) {
      return false;
    }

    db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)').run(todoId, tagId);
    return true;
  },

  removeFromTodo(userId: number, todoId: number, tagId: number): boolean {
    const todo = getTodoRowById(userId, todoId);
    if (!todo) {
      return false;
    }

    const result = db.prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?').run(todoId, tagId);
    return result.changes > 0;
  },

  getOrCreateByName(userId: number, name: string, color = '#3b82f6'): Tag {
    const existing = db
      .prepare('SELECT * FROM tags WHERE user_id = ? AND LOWER(name) = LOWER(?)')
      .get(userId, name.trim()) as Record<string, unknown> | undefined;

    if (existing) {
      return mapTagRow(existing);
    }

    return this.create(userId, name.trim(), color);
  },
};

export const templateDB = {
  listByUser(userId: number): Template[] {
    const rows = db
      .prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY updated_at DESC, id DESC')
      .all(userId) as Record<string, unknown>[];

    return rows.map(mapTemplateRow);
  },

  getById(userId: number, templateId: number): Template | null {
    const row = db
      .prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?')
      .get(templateId, userId) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return mapTemplateRow(row);
  },

  create(userId: number, input: TemplateInput): Template {
    const now = nowISO();

    const result = db
      .prepare(
        `
        INSERT INTO templates (
          user_id,
          name,
          description,
          category,
          title,
          priority,
          is_recurring,
          recurrence_pattern,
          reminder_minutes,
          due_offset_days,
          subtasks_json,
          tag_names_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        userId,
        input.name.trim(),
        input.description?.trim() || null,
        input.category?.trim() || null,
        input.title.trim(),
        normalizePriority(input.priority),
        boolToDb(input.is_recurring),
        normalizeRecurrence(input.recurrence_pattern),
        input.reminder_minutes ?? null,
        input.due_offset_days ?? null,
        JSON.stringify(input.subtasks ?? []),
        JSON.stringify(input.tagNames ?? []),
        now,
        now,
      );

    const created = this.getById(userId, Number(result.lastInsertRowid));
    if (!created) {
      throw new Error('Template create failed');
    }

    return created;
  },

  update(userId: number, templateId: number, input: Partial<TemplateInput>): Template | null {
    const existing = this.getById(userId, templateId);
    if (!existing) {
      return null;
    }

    const now = nowISO();

    db.prepare(
      `
      UPDATE templates
      SET
        name = ?,
        description = ?,
        category = ?,
        title = ?,
        priority = ?,
        is_recurring = ?,
        recurrence_pattern = ?,
        reminder_minutes = ?,
        due_offset_days = ?,
        subtasks_json = ?,
        tag_names_json = ?,
        updated_at = ?
      WHERE id = ? AND user_id = ?
    `,
    ).run(
      input.name === undefined ? existing.name : input.name.trim(),
      input.description === undefined ? existing.description : input.description?.trim() || null,
      input.category === undefined ? existing.category : input.category?.trim() || null,
      input.title === undefined ? existing.title : input.title.trim(),
      input.priority === undefined ? existing.priority : normalizePriority(input.priority),
      input.is_recurring === undefined ? boolToDb(existing.is_recurring) : boolToDb(input.is_recurring),
      input.recurrence_pattern === undefined
        ? normalizeRecurrence(existing.recurrence_pattern)
        : normalizeRecurrence(input.recurrence_pattern),
      input.reminder_minutes === undefined ? existing.reminder_minutes : input.reminder_minutes,
      input.due_offset_days === undefined ? existing.due_offset_days : input.due_offset_days,
      input.subtasks === undefined ? existing.subtasks_json : JSON.stringify(input.subtasks),
      input.tagNames === undefined ? existing.tag_names_json : JSON.stringify(input.tagNames),
      now,
      templateId,
      userId,
    );

    return this.getById(userId, templateId);
  },

  delete(userId: number, templateId: number): boolean {
    const result = db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(templateId, userId);
    return result.changes > 0;
  },

  createFromTodo(
    userId: number,
    todoId: number,
    templateMeta: { name: string; description?: string | null; category?: string | null },
  ): Template | null {
    const todo = todoDB.getById(userId, todoId);
    if (!todo) {
      return null;
    }

    const dueOffsetDays = todo.due_date
      ? Math.max(
          0,
          Math.round((new Date(todo.due_date).getTime() - getSingaporeNow().getTime()) / (24 * 60 * 60 * 1000)),
        )
      : null;

    return this.create(userId, {
      name: templateMeta.name,
      description: templateMeta.description,
      category: templateMeta.category,
      title: todo.title,
      priority: todo.priority,
      is_recurring: todo.is_recurring,
      recurrence_pattern: todo.recurrence_pattern,
      reminder_minutes: todo.reminder_minutes,
      due_offset_days: dueOffsetDays,
      subtasks: todo.subtasks.map((subtask) => ({
        title: subtask.title,
        position: subtask.position,
      })),
      tagNames: todo.tags.map((tag) => tag.name),
    });
  },

  useTemplate(userId: number, templateId: number): Todo | null {
    const template = this.getById(userId, templateId);
    if (!template) {
      return null;
    }

    const now = getSingaporeNow();
    let dueDate: string | null = null;

    if (template.due_offset_days !== null) {
      const due = new Date(now);
      due.setDate(due.getDate() + template.due_offset_days);
      dueDate = due.toISOString();
    }

    const tagNames = JSON.parse(template.tag_names_json || '[]') as string[];
    const subtasks = JSON.parse(template.subtasks_json || '[]') as TemplateSubtask[];

    const tagIds = tagNames.map((name) => tagDB.getOrCreateByName(userId, name).id);

    const todo = todoDB.create(userId, {
      title: template.title,
      priority: template.priority,
      due_date: dueDate,
      is_recurring: template.is_recurring,
      recurrence_pattern: template.recurrence_pattern,
      reminder_minutes: template.reminder_minutes,
      tagIds,
    });

    for (const subtask of subtasks) {
      subtaskDB.create(userId, todo.id, subtask.title, subtask.position);
    }

    return todoDB.getById(userId, todo.id);
  },
};

export const holidayDB = {
  list(): Holiday[] {
    const rows = db.prepare('SELECT * FROM holidays ORDER BY date ASC').all() as Record<string, unknown>[];

    return rows.map((row) => ({
      id: Number(row.id),
      date: String(row.date ?? ''),
      name: String(row.name ?? ''),
    }));
  },
};

export { db as sqlite };
