import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = todoDB.export(session.userId);
  return NextResponse.json(payload, {
    headers: {
      'Content-Disposition': `attachment; filename="todos-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
