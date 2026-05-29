import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { templateDB } from '@/lib/db';

export const runtime = 'nodejs';

type Params = {
  params: { id: string };
};

export async function PUT(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;
  const templateId = Number(id);

  const body = (await request.json()) as {
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

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: 'Template name cannot be empty' }, { status: 400 });
  }

  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: 'Template title cannot be empty' }, { status: 400 });
  }

  const template = templateDB.update(session.userId, templateId, body);
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json({ template });
}

export async function DELETE(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;
  const ok = templateDB.delete(session.userId, Number(id));

  if (!ok) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
