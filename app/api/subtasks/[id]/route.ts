import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { subtaskDB } from '@/lib/db';

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
  const subtaskId = Number(id);

  const body = (await request.json()) as { title?: string; is_completed?: boolean };

  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: 'Subtask title cannot be empty' }, { status: 400 });
  }

  const subtask = subtaskDB.update(session.userId, subtaskId, {
    title: body.title,
    is_completed: body.is_completed,
  });

  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  return NextResponse.json({ subtask });
}

export async function DELETE(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;
  const ok = subtaskDB.delete(session.userId, Number(id));

  if (!ok) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
