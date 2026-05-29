import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { NextRequest, NextResponse } from 'next/server';

import { authenticatorDB, userDB } from '@/lib/db';
import { getExpectedOrigin, getRPID, saveChallenge } from '@/lib/webauthn-store';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { username?: string };
    const username = body.username?.trim();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const user = userDB.getByUsername(username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const authenticators = authenticatorDB.listByUserId(user.id);
    if (authenticators.length === 0) {
      return NextResponse.json({ error: 'No passkey registered for this user' }, { status: 404 });
    }

    const options = await generateAuthenticationOptions({
      rpID: getRPID(request),
      timeout: 60_000,
      userVerification: 'preferred',
      allowCredentials: authenticators.map((authenticator) => ({
        id: isoBase64URL.toBuffer(authenticator.credential_id),
        type: 'public-key',
      })),
    });

    saveChallenge('login', username, options.challenge);

    return NextResponse.json({
      options,
      expectedOrigin: getExpectedOrigin(request),
    });
  } catch (error) {
    console.error('login-options error', error);
    return NextResponse.json({ error: 'Failed to generate login options' }, { status: 500 });
  }
}
