import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export const runtime = 'nodejs';

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const tags = tagDB.listByUser(session.userId);
  return NextResponse.json({ tags });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

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
    const tag = tagDB.create(session.userId, name, color);
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    const message = String(error);
    if (message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Tag name must be unique' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
