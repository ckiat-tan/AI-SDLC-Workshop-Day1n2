import { expect, request as playwrightRequest, test as base, type APIRequestContext } from '@playwright/test';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import path from 'node:path';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-this-dev-secret';
const SESSION_COOKIE_NAME = 'todo_session';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const dbPath = path.join(process.cwd(), 'todos.db');

type TestUser = {
  id: number;
  username: string;
};

type Fixtures = {
  user: TestUser;
  sessionToken: string;
  authedRequest: APIRequestContext;
};

function withDb<T>(fn: (db: Database.Database) => T): T {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export function resetDatabase(): void {
  withDb((db) => {
    db.exec(`
      DELETE FROM todo_tags;
      DELETE FROM subtasks;
      DELETE FROM todos;
      DELETE FROM tags;
      DELETE FROM templates;
      DELETE FROM authenticators;
      DELETE FROM users;
      DELETE FROM sqlite_sequence
      WHERE name IN ('users', 'authenticators', 'todos', 'subtasks', 'tags', 'templates');
    `);
  });
}

export function clearUserData(userId: number): void {
  withDb((db) => {
    db.prepare('DELETE FROM templates WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM tags WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM todos WHERE user_id = ?').run(userId);
  });
}

export function createUser(username?: string): TestUser {
  const safeName = username ?? `e2e-user-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const createdAt = new Date().toISOString();

  return withDb((db) => {
    const result = db
      .prepare('INSERT INTO users (username, created_at) VALUES (?, ?)')
      .run(safeName, createdAt);

    return {
      id: Number(result.lastInsertRowid),
      username: safeName,
    };
  });
}

export function createAuthenticator(userId: number): number {
  const createdAt = new Date().toISOString();

  return withDb((db) => {
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
        userId,
        'dGVzdC1jcmVkZW50aWFsLWlk',
        'dGVzdC1wdWJsaWMta2V5',
        0,
        JSON.stringify(['internal']),
        createdAt,
      );

    return Number(result.lastInsertRowid);
  });
}

export function createSessionToken(user: TestUser): string {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

export function makeCookieHeader(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

export const test = base.extend<Fixtures>({
  user: async ({}, use) => {
    resetDatabase();
    const user = createUser();
    await use(user);
  },

  sessionToken: async ({ user }, use) => {
    await use(createSessionToken(user));
  },

  authedRequest: async ({ sessionToken }, use) => {
    const context = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        Cookie: makeCookieHeader(sessionToken),
      },
    });

    await use(context);
    await context.dispose();
  },
});

export { expect, BASE_URL };
