import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { subtaskDB } from '@/lib/db';

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

  const body = (await request.json()) as { title?: string; position?: number };
  const title = body.title?.trim();

  if (!title) {
    return NextResponse.json({ error: 'Subtask title is required' }, { status: 400 });
  }

  try {
    const subtask = subtaskDB.create(session.userId, todoId, title, body.position);
    return NextResponse.json({ subtask }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }
}
