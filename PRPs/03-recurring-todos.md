# Feature 03 - Recurring Todos

## Objective
Automate repeatable tasks by generating the next todo instance when a recurring todo is completed.

## Implemented Capabilities
- Enable recurring behavior with recurrence pattern.
- Support patterns: daily, weekly, monthly, yearly.
- Require due date and recurrence pattern for recurring todos.
- On completion, auto-create the next instance.
- Inherit metadata to next instance:
  - title
  - priority
  - reminder_minutes
  - recurrence_pattern

## API Surface
- POST /api/todos (is_recurring, recurrence_pattern)
- PUT /api/todos/:id (completion triggers next instance creation)

## Data Model Touchpoints
- todos.is_recurring
- todos.recurrence_pattern
- todos.due_date

## Validation Rules
- recurring todos must include due_date.
- recurring todos must include recurrence_pattern.

## Verification
- Playwright spec: tests/03-recurring-todos.spec.ts
- Covered scenarios:
  - create daily recurring todo
  - complete recurring todo and verify next instance exists
  - confirm inherited metadata on next instance
  - verify daily due date shifts by 24 hours
  - reject recurring todo without due date or pattern

## Status
- Implementation: Complete
- Verification: Complete (E2E passing)
- Last updated: 2026-05-29
