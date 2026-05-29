import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { templateDB } from '@/lib/db';

export const runtime = 'nodejs';

type Params = {
  params: { id: string };
};

export async function POST(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;
  const todo = templateDB.useTemplate(session.userId, Number(id));

  if (!todo) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json({ todo }, { status: 201 });
}
