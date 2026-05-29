import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { NextRequest, NextResponse } from 'next/server';

import { setSessionCookie } from '@/lib/auth';
import { authenticatorDB, userDB } from '@/lib/db';
import { consumeChallenge, getExpectedOrigin, getRPID } from '@/lib/webauthn-store';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      username?: string;
      response?: Record<string, unknown>;
    };

    const username = body.username?.trim();
    if (!username || !body.response) {
      return NextResponse.json({ error: 'Username and response are required' }, { status: 400 });
    }

    const user = userDB.getByUsername(username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const expectedChallenge = consumeChallenge('login', username);
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge expired or invalid' }, { status: 400 });
    }

    const credentialId = typeof body.response.id === 'string' ? body.response.id : '';
    const authenticator = authenticatorDB.getByCredentialId(credentialId);
    if (!authenticator || authenticator.user_id !== user.id) {
      return NextResponse.json({ error: 'Authenticator not found' }, { status: 404 });
    }

    const verification = await verifyAuthenticationResponse({
      response: body.response as any,
      expectedChallenge,
      expectedOrigin: getExpectedOrigin(request),
      expectedRPID: getRPID(request),
      authenticator: {
        credentialID: isoBase64URL.toBuffer(authenticator.credential_id),
        credentialPublicKey: isoBase64URL.toBuffer(authenticator.public_key),
        counter: authenticator.counter ?? 0,
        transports: authenticator.transports ? (JSON.parse(authenticator.transports) as any) : [],
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Login verification failed' }, { status: 401 });
    }

    const newCounter = verification.authenticationInfo.newCounter ?? authenticator.counter ?? 0;
    authenticatorDB.updateCounter(authenticator.id, newCounter);

    const response = NextResponse.json({ ok: true, user });
    setSessionCookie(response, {
      userId: user.id,
      username: user.username,
    });

    return response;
  } catch (error) {
    console.error('login-verify error', error);
    return NextResponse.json({ error: 'Failed to verify login' }, { status: 500 });
  }
}
