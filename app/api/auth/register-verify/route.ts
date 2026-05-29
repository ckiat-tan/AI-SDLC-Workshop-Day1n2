import { verifyRegistrationResponse } from '@simplewebauthn/server';
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

    if (userDB.getByUsername(username)) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const expectedChallenge = consumeChallenge('register', username);
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge expired or invalid' }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response: body.response as any,
      expectedChallenge,
      expectedOrigin: getExpectedOrigin(request),
      expectedRPID: getRPID(request),
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Registration verification failed' }, { status: 400 });
    }

    const info = verification.registrationInfo as any;
    const credential = info.credential as
      | {
          id?: string;
          publicKey?: Uint8Array;
          counter?: number;
          transports?: string[];
        }
      | undefined;

    const credentialId = credential?.id ?? (info.credentialID ? isoBase64URL.fromBuffer(info.credentialID) : null);

    const publicKey = credential?.publicKey
      ? isoBase64URL.fromBuffer(credential.publicKey)
      : info.credentialPublicKey
        ? isoBase64URL.fromBuffer(info.credentialPublicKey)
        : null;

    if (!credentialId || !publicKey) {
      return NextResponse.json({ error: 'Credential payload missing' }, { status: 400 });
    }

    const user = userDB.create(username);

    authenticatorDB.create({
      userId: user.id,
      credentialId,
      publicKey,
      counter: credential?.counter ?? info.counter ?? 0,
      transports: credential?.transports ?? [],
    });

    const response = NextResponse.json({ ok: true, user });
    setSessionCookie(response, {
      userId: user.id,
      username: user.username,
    });

    return response;
  } catch (error) {
    console.error('register-verify error', error);
    return NextResponse.json({ error: 'Failed to verify registration' }, { status: 500 });
  }
}
