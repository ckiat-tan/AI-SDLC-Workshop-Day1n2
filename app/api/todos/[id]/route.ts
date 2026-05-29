import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import type { Priority, RecurrencePattern } from '@/lib/db';
import { todoDB } from '@/lib/db';
import { addRecurrence, isAtLeastOneMinuteInFuture } from '@/lib/timezone';

export const runtime = 'nodejs';

type Params = {
  params: { id: string };
};

function isValidPriority(value: unknown): value is Priority {
  return value === 'high' || value === 'medium' || value === 'low';
}

function isValidRecurrence(value: unknown): value is RecurrencePattern {
  return value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly';
}

export async function GET(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;
  const todo = todoDB.getById(session.userId, Number(id));

  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  return NextResponse.json({ todo });
}

export async function PUT(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;
  const todoId = Number(id);
  const existing = todoDB.getById(session.userId, todoId);

  if (!existing) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
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
    is_completed?: boolean;
  };

  if (body.priority && !isValidPriority(body.priority)) {
    return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 });
  }

  if (body.recurrence_pattern && !isValidRecurrence(body.recurrence_pattern)) {
    return NextResponse.json({ error: 'Invalid recurrence pattern' }, { status: 400 });
  }

  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: 'Todo title cannot be empty' }, { status: 400 });
  }

  if (body.due_date && !isAtLeastOneMinuteInFuture(body.due_date) && !existing.is_completed) {
    return NextResponse.json({ error: 'Due date must be at least 1 minute in the future (Singapore timezone)' }, { status: 400 });
  }

  if (body.is_recurring && !body.due_date && !existing.due_date) {
    return NextResponse.json({ error: 'Recurring todos require a due date' }, { status: 400 });
  }

  if (
    body.reminder_minutes !== undefined &&
    body.reminder_minutes !== null &&
    body.due_date === null &&
    !(body.due_date || existing.due_date)
  ) {
    return NextResponse.json({ error: 'Reminder requires due date' }, { status: 400 });
  }

  let updated = todoDB.update(session.userId, todoId, {
    title: body.title ?? existing.title,
    description: body.description === undefined ? existing.description : body.description,
    priority: body.priority ?? existing.priority,
    due_date: body.due_date === undefined ? existing.due_date : body.due_date,
    is_recurring: body.is_recurring === undefined ? existing.is_recurring : body.is_recurring,
    recurrence_pattern: body.recurrence_pattern === undefined ? existing.recurrence_pattern : body.recurrence_pattern,
    reminder_minutes: body.reminder_minutes === undefined ? existing.reminder_minutes : body.reminder_minutes,
    tagIds: body.tagIds,
  });

  if (!updated) {
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }

  let nextRecurringTodo = null;

  if (typeof body.is_completed === 'boolean' && body.is_completed !== updated.is_completed) {
    updated = todoDB.updateCompletion(session.userId, todoId, body.is_completed);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update completion status' }, { status: 500 });
    }

    if (
      body.is_completed &&
      updated.is_recurring &&
      updated.recurrence_pattern &&
      updated.due_date
    ) {
      const nextDueDate = addRecurrence(updated.due_date, updated.recurrence_pattern);
      nextRecurringTodo = todoDB.createRecurringInstance(session.userId, updated, nextDueDate);
    }
  }

  return NextResponse.json({
    todo: updated,
    nextRecurringTodo,
  });
}

export async function DELETE(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;
  const ok = todoDB.delete(session.userId, Number(id));

  if (!ok) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
