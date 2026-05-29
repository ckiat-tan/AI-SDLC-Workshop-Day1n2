# API Latency Benchmark (Railway Production)

- Target: https://ai-sdlc-workshop-day1n2-production-8d2e.up.railway.app
- Timestamp: 2026-05-29T08:33:02.155Z
- Runs per endpoint: 30

| Endpoint | Min (ms) | Avg (ms) | P95 (ms) | Max (ms) | Status Distribution |
|---|---:|---:|---:|---:|---|
| /api/holidays | 245.22 | 290.89 | 364.79 | 674.84 | 401: 30 |
| /api/auth/me | 248.07 | 276.62 | 359.51 | 459.02 | 401: 30 |
| /api/todos | 245.14 | 263.32 | 351.2 | 357.71 | 401: 30 |
| /api/tags | 244.64 | 259.27 | 267.9 | 358.3 | 401: 30 |
| /api/notifications/check | 248.87 | 259.65 | 264.62 | 355.46 | 401: 30 |

## Notes

- Unauthenticated endpoints are expected to return HTTP 401 for protected routes.
- Benchmark uses sequential requests from the local environment to production.
