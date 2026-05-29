import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export const runtime = 'nodejs';

type Params = {
  params: { id: string };
};

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;
  const todoId = Number(id);

  const body = (await request.json()) as { tagId?: number };
  if (!body.tagId) {
    return NextResponse.json({ error: 'tagId is required' }, { status: 400 });
  }

  const ok = tagDB.assignToTodo(session.userId, todoId, body.tagId);
  if (!ok) {
    return NextResponse.json({ error: 'Todo or tag not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;
  const todoId = Number(id);

  const body = (await request.json()) as { tagId?: number };
  if (!body.tagId) {
    return NextResponse.json({ error: 'tagId is required' }, { status: 400 });
  }

  const ok = tagDB.removeFromTodo(session.userId, todoId, body.tagId);
  if (!ok) {
    return NextResponse.json({ error: 'Todo or tag relation not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
