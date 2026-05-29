import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { holidayDB } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const holidays = holidayDB.list();
  return NextResponse.json({ holidays });
}
