import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import type { Priority, RecurrencePattern } from '@/lib/db';
import { todoDB } from '@/lib/db';
import { isAtLeastOneMinuteInFuture } from '@/lib/timezone';
import { isValidPriority, isValidRecurrence } from '@/lib/validators/todo';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.get('search')?.trim().toLowerCase();
  const priorityFilter = request.nextUrl.searchParams.get('priority');
  const tagIdFilter = request.nextUrl.searchParams.get('tagId');

  let todos = todoDB.listByUser(session.userId);

  if (search) {
    todos = todos.filter((todo) => {
      const inTitle = todo.title.toLowerCase().includes(search);
      const inTags = todo.tags.some((tag) => tag.name.toLowerCase().includes(search));
      return inTitle || inTags;
    });
  }

  if (isValidPriority(priorityFilter)) {
    todos = todos.filter((todo) => todo.priority === priorityFilter);
  }

  if (tagIdFilter) {
    const id = Number(tagIdFilter);
    todos = todos.filter((todo) => todo.tags.some((tag) => tag.id === id));
  }

  return NextResponse.json({ todos });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string | null;
    priority?: Priority;
    due_date?: string | null;
    is_recurring?: boolean;
    recurrence_pattern?: RecurrencePattern | null;
    reminder_minutes?: number | null;
    tagIds?: number[];
  };

  const title = body.title?.trim() ?? '';
  if (!title) {
    return NextResponse.json({ error: 'Todo title is required' }, { status: 400 });
  }

  if (body.priority && !isValidPriority(body.priority)) {
    return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 });
  }

  if (body.due_date && !isAtLeastOneMinuteInFuture(body.due_date)) {
    return NextResponse.json({ error: 'Due date must be at least 1 minute in the future (Singapore timezone)' }, { status: 400 });
  }

  if (body.is_recurring) {
    if (!body.due_date) {
      return NextResponse.json({ error: 'Recurring todos require a due date' }, { status: 400 });
    }

    if (!body.recurrence_pattern || !isValidRecurrence(body.recurrence_pattern)) {
      return NextResponse.json({ error: 'Recurring todos require a valid recurrence pattern' }, { status: 400 });
    }
  }

  if (body.reminder_minutes !== null && body.reminder_minutes !== undefined && !body.due_date) {
    return NextResponse.json({ error: 'Reminder requires due date' }, { status: 400 });
  }

  const todo = todoDB.create(session.userId, {
    title,
    description: body.description ?? null,
    priority: body.priority ?? 'medium',
    due_date: body.due_date ?? null,
    is_recurring: body.is_recurring ?? false,
    recurrence_pattern: body.recurrence_pattern ?? null,
    reminder_minutes: body.reminder_minutes ?? null,
    tagIds: Array.isArray(body.tagIds) ? body.tagIds : [],
  });

  return NextResponse.json({ todo }, { status: 201 });
}
