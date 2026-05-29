import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import { validateExportPayload } from '@/lib/validators/import';

export const runtime = 'nodejs';

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

  const validation = validateExportPayload(payload);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: validation.error,
      },
      { status: 400 },
    );
  }

  try {
    const counts = todoDB.import(session.userId, validation.payload);

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
