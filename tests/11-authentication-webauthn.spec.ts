import { test, expect, BASE_URL, createAuthenticator } from './fixtures';

test.describe('Feature 11 - Authentication (WebAuthn)', () => {
  test('enforces route protection and login redirect behavior', async ({ browser, sessionToken }) => {
    const unauthContext = await browser.newContext();
    const unauthPage = await unauthContext.newPage();

    await unauthPage.goto('/');
    await expect(unauthPage).toHaveURL(/\/login/);

    await unauthPage.goto('/calendar');
    await expect(unauthPage).toHaveURL(/\/login/);

    await unauthContext.close();

    const authedContext = await browser.newContext();
    await authedContext.addCookies([
      {
        name: 'todo_session',
        value: sessionToken,
        url: BASE_URL,
      },
    ]);

    const authedPage = await authedContext.newPage();
    await authedPage.goto('/login');
    await expect(authedPage).toHaveURL(/\/$/);

    await authedContext.close();
  });

  test('supports session me/logout contract', async ({ authedRequest, user }) => {
    const me = await authedRequest.get('/api/auth/me');
    expect(me.status()).toBe(200);

    const meData = (await me.json()) as { user: { username: string } };
    expect(meData.user.username).toBe(user.username);

    const logout = await authedRequest.post('/api/auth/logout');
    expect(logout.status()).toBe(200);

    const setCookie = logout.headers()['set-cookie'];
    expect(setCookie).toContain('todo_session=');
    expect(setCookie.toLowerCase()).toContain('max-age=0');
  });

  test('validates register/login options flow and authenticator lookup', async ({ authedRequest, user }) => {
    const missingUsername = await authedRequest.post('/api/auth/register-options', {
      data: {},
    });
    expect(missingUsername.status()).toBe(400);

    const duplicateUser = await authedRequest.post('/api/auth/register-options', {
      data: { username: user.username },
    });
    expect(duplicateUser.status()).toBe(409);

    const freshRegisterOptions = await authedRequest.post('/api/auth/register-options', {
      data: { username: `${user.username}-new` },
    });
    expect(freshRegisterOptions.status()).toBe(200);

    const freshData = (await freshRegisterOptions.json()) as {
      options: { challenge: string };
    };
    expect(freshData.options.challenge.length).toBeGreaterThan(10);

    const missingUserLogin = await authedRequest.post('/api/auth/login-options', {
      data: { username: 'unknown-user' },
    });
    expect(missingUserLogin.status()).toBe(404);

    const noPasskeyLogin = await authedRequest.post('/api/auth/login-options', {
      data: { username: user.username },
    });
    expect(noPasskeyLogin.status()).toBe(404);

    createAuthenticator(user.id);

    const loginOptions = await authedRequest.post('/api/auth/login-options', {
      data: { username: user.username },
    });
    expect(loginOptions.status()).toBe(200);

    const loginData = (await loginOptions.json()) as {
      options: { challenge: string; allowCredentials: unknown[] };
    };

    expect(loginData.options.challenge.length).toBeGreaterThan(10);
    expect(loginData.options.allowCredentials.length).toBeGreaterThan(0);
  });
});
