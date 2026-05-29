# Feature 04 - Reminders and Notifications

## Objective
Notify users before due times and prevent duplicate reminder delivery.

## Implemented Capabilities
- Set reminder lead time in minutes on a todo.
- Check for due notifications through dedicated API route.
- Return reminders once and suppress duplicate returns.
- Store notification send marker for deduplication.
- Enforce reminder setup only when due date exists.

## API Surface
- GET /api/notifications/check
- POST /api/todos (reminder_minutes)
- PUT /api/todos/:id (reminder updates)

## Data Model Touchpoints
- todos.reminder_minutes
- todos.last_notification_sent
- todos.due_date

## Validation Rules
- reminder_minutes requires due_date.

## Verification
- Playwright spec: tests/04-reminders-notifications.spec.ts
- Covered scenarios:
  - create todo with near due date and reminder
  - verify first notification check returns reminder
  - verify second notification check returns no duplicates
  - reject reminder assignment without due date

## Status
- Implementation: Complete
- Verification: Complete (E2E passing)
- Last updated: 2026-05-29
