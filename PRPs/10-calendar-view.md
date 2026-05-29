# Feature 10 - Calendar View

## Objective
Provide a month-based planning view that overlays due todos and Singapore holidays on calendar days.

## Implemented Capabilities
- Serve calendar page at /calendar.
- Load and display holidays from API.
- Render todos on their due dates in the month grid.
- Open day-level modal to inspect todos for a selected date.
- Read month state from URL query parameter (month key).

## API Surface
- GET /api/holidays
- Page route: /calendar?month=YYYY-MM

## Data Model Touchpoints
- holidays table seeded with Singapore holiday dates.
- todos.due_date used to place todos on calendar cells.

## Validation Rules
- calendar month parsing must accept YYYY-MM for navigation state.
- todo-day matching is based on due date day boundary in app timezone logic.

## Verification
- Playwright spec: tests/10-calendar-view.spec.ts
- Covered scenarios:
  - create todo with fixed August 2026 due date
  - open calendar for month 2026-08
  - verify month key indicator
  - verify National Day holiday display
  - verify todo display on calendar grid
  - open day modal and verify exact todo text

## Status
- Implementation: Complete
- Verification: Complete (E2E passing)
- Last updated: 2026-05-29
