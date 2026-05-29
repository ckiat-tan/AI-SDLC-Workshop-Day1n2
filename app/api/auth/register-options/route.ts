import { generateRegistrationOptions } from '@simplewebauthn/server';
import { NextRequest, NextResponse } from 'next/server';

import { userDB } from '@/lib/db';
import { getExpectedOrigin, getRPID, saveChallenge } from '@/lib/webauthn-store';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { username?: string };
    const username = body.username?.trim();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const existing = userDB.getByUsername(username);
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const options = await generateRegistrationOptions({
      rpName: 'AI-SDLC Todo App',
      rpID: getRPID(request),
      userName: username,
      userDisplayName: username,
      userID: crypto.randomUUID(),
      timeout: 60_000,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    saveChallenge('register', username, options.challenge);

    return NextResponse.json({
      options,
      expectedOrigin: getExpectedOrigin(request),
    });
  } catch (error) {
    console.error('register-options error', error);
    return NextResponse.json({ error: 'Failed to generate register options' }, { status: 500 });
  }
}
