'use client';

import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'register' | 'login'>('login');

  useEffect(() => {
    const checkSession = async () => {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        router.push('/');
      }
    };

    void checkSession();
  }, [router]);

  async function registerWithPasskey() {
    if (!username.trim()) {
      setMessage('Please enter a username first.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const optionsResponse = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      const optionsData = await optionsResponse.json();
      if (!optionsResponse.ok) {
        throw new Error(optionsData.error || 'Could not generate registration options');
      }

      const registrationResponse = await startRegistration(optionsData.options);

      const verifyResponse = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          response: registrationResponse,
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Registration failed');
      }

      router.push('/');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Passkey registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function loginWithPasskey() {
    if (!username.trim()) {
      setMessage('Please enter a username first.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const optionsResponse = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      const optionsData = await optionsResponse.json();
      if (!optionsResponse.ok) {
        throw new Error(optionsData.error || 'Could not generate login options');
      }

      const authenticationResponse = await startAuthentication(optionsData.options);

      const verifyResponse = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          response: authenticationResponse,
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Login failed');
      }

      router.push('/');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Passkey login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <section className="card" style={{ width: 'min(560px, 100%)', padding: '1.2rem' }}>
        <h1 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Todo App Sign In</h1>
        <p style={{ marginTop: 0, color: '#4e5563' }}>
          Use passkeys only. No passwords required.
        </p>

        <label className="label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className="input"
          value={username}
          placeholder="your-name"
          onChange={(event) => setUsername(event.target.value)}
          disabled={loading}
        />

        <div className="row" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className={`btn ${mode === 'login' ? 'primary' : ''}`}
            onClick={() => setMode('login')}
            disabled={loading}
          >
            Login
          </button>
          <button
            type="button"
            className={`btn ${mode === 'register' ? 'primary' : ''}`}
            onClick={() => setMode('register')}
            disabled={loading}
          >
            Register
          </button>
        </div>

        <div className="row" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="btn primary"
            disabled={loading}
            onClick={mode === 'register' ? registerWithPasskey : loginWithPasskey}
          >
            {loading ? 'Please wait...' : mode === 'register' ? 'Register With Passkey' : 'Login With Passkey'}
          </button>
        </div>

        {message ? (
          <p style={{ color: '#b42318', marginBottom: 0 }} role="alert">
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
