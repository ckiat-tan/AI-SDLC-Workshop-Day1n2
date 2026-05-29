import type { NextRequest } from 'next/server';

type WebAuthnIntent = 'register' | 'login';

type ChallengeRecord = {
  challenge: string;
  createdAt: number;
};

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const challengeStore = new Map<string, ChallengeRecord>();

function challengeKey(intent: WebAuthnIntent, username: string): string {
  return `${intent}:${username.trim().toLowerCase()}`;
}

export function saveChallenge(intent: WebAuthnIntent, username: string, challenge: string): void {
  challengeStore.set(challengeKey(intent, username), {
    challenge,
    createdAt: Date.now(),
  });
}

export function consumeChallenge(intent: WebAuthnIntent, username: string): string | null {
  const key = challengeKey(intent, username);
  const record = challengeStore.get(key);
  challengeStore.delete(key);

  if (!record) {
    return null;
  }

  if (Date.now() - record.createdAt > CHALLENGE_TTL_MS) {
    return null;
  }

  return record.challenge;
}

export function getRPID(request?: NextRequest): string {
  if (process.env.RP_ID) {
    return process.env.RP_ID;
  }

  const host = request?.headers.get('host') ?? 'localhost:3000';
  return host.split(':')[0] || 'localhost';
}

export function getExpectedOrigin(request?: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  const host = request?.headers.get('host') ?? 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}
