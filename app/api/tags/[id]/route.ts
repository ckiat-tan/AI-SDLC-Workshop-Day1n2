import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export const runtime = 'nodejs';

type Params = {
  params: { id: string };
};

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export async function PUT(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;
  const tagId = Number(id);

  const body = (await request.json()) as { name?: string; color?: string };
  const name = body.name?.trim();
  const color = body.color || '#3b82f6';

  if (!name) {
    return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
  }

  if (!isHexColor(color)) {
    return NextResponse.json({ error: 'Tag color must be a valid hex value' }, { status: 400 });
  }

  try {
    const tag = tagDB.update(session.userId, tagId, name, color);
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({ tag });
  } catch (error) {
    const message = String(error);
    if (message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Tag name must be unique' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;
  const ok = tagDB.delete(session.userId, Number(id));

  if (!ok) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
