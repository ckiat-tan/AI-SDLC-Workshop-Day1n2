import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import type { ExportPayload } from '@/lib/db';
import { todoDB } from '@/lib/db';

export const runtime = 'nodejs';

function isValidPayload(value: unknown): value is ExportPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.version === 'string' &&
    Array.isArray(payload.todos) &&
    Array.isArray(payload.subtasks) &&
    Array.isArray(payload.tags) &&
    Array.isArray(payload.todoTags)
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 });
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json(
      {
        error: 'Invalid import format. Expected fields: version, todos, subtasks, tags, todoTags',
      },
      { status: 400 },
    );
  }

  try {
    const counts = todoDB.import(session.userId, payload);

    return NextResponse.json({
      ok: true,
      message: `Imported ${counts.todos} todos, ${counts.subtasks} subtasks, and ${counts.tags} new tags`,
      counts,
    });
  } catch (error) {
    console.error('import error', error);
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 });
  }
}
