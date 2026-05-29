# Feature 11 - Authentication (WebAuthn)

## Objective
Secure the application with passwordless WebAuthn authentication and session-based route protection.

## Implemented Capabilities
- Register and login flows using WebAuthn challenge-response endpoints.
- Create and verify session cookie for authenticated users.
- Enforce route protection on app pages.
- Redirect authenticated users away from login page.
- Expose auth status endpoint for active session checks.
- Support explicit logout that clears session cookie.

## API Surface
- POST /api/auth/register-options
- POST /api/auth/register-verify
- POST /api/auth/login-options
- POST /api/auth/login-verify
- POST /api/auth/logout
- GET /api/auth/me

## Data Model Touchpoints
- users table
- authenticators table
- todo_session cookie for session token

## Validation Rules
- registration options require username and reject duplicates.
- login options return not found for unknown users.
- login options require at least one registered authenticator.
- logout clears cookie immediately.

## Verification
- Playwright spec: tests/11-authentication-webauthn.spec.ts
- Covered scenarios:
  - unauthenticated access to protected routes redirects to login
  - authenticated access to login redirects to app root
  - auth/me returns current user
  - logout clears session cookie with max-age=0
  - register-options validation for missing and duplicate usernames
  - login-options validation for unknown users and users with no passkeys
  - login-options success after authenticator seed

## Status
- Implementation: Complete
- Verification: Complete (E2E passing)
- Last updated: 2026-05-29
