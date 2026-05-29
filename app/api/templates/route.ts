import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { templateDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const templates = templateDB.listByUser(session.userId);
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json()) as {
    todoId?: number;
    name?: string;
    description?: string | null;
    category?: string | null;
    title?: string;
    priority?: 'high' | 'medium' | 'low';
    is_recurring?: boolean;
    recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    reminder_minutes?: number | null;
    due_offset_days?: number | null;
    subtasks?: Array<{ title: string; position: number }>;
    tagNames?: string[];
  };

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
  }

  if (body.todoId) {
    const template = templateDB.createFromTodo(session.userId, body.todoId, {
      name,
      description: body.description,
      category: body.category,
    });

    if (!template) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json({ template }, { status: 201 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: 'Template title is required when creating directly' }, { status: 400 });
  }

  const template = templateDB.create(session.userId, {
    name,
    description: body.description,
    category: body.category,
    title,
    priority: body.priority,
    is_recurring: body.is_recurring,
    recurrence_pattern: body.recurrence_pattern,
    reminder_minutes: body.reminder_minutes,
    due_offset_days: body.due_offset_days,
    subtasks: body.subtasks,
    tagNames: body.tagNames,
  });

  return NextResponse.json({ template }, { status: 201 });
}
