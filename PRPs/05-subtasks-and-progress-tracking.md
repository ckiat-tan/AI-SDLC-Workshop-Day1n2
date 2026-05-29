# Feature 05 - Subtasks and Progress Tracking

## Objective
Break parent tasks into smaller items and expose accurate completion progress.

## Implemented Capabilities
- Add subtasks to a parent todo.
- Toggle subtask completion state.
- Delete subtasks independently.
- Return subtasks as part of todo detail payload.
- Cascade-delete subtasks when parent todo is removed.
- Compute progress from completed subtasks over total subtasks.

## API Surface
- POST /api/todos/:id/subtasks
- PUT /api/subtasks/:id
- DELETE /api/subtasks/:id
- GET /api/todos/:id (includes subtasks)

## Data Model Touchpoints
- subtasks table linked to todos by foreign key.
- foreign key cascade ensures cleanup on parent deletion.

## Validation Rules
- subtask operations require valid parent or subtask IDs.
- updating deleted subtasks returns not found.

## Verification
- Playwright spec: tests/05-subtasks-progress.spec.ts
- Covered scenarios:
  - add multiple subtasks
  - mark one subtask completed
  - verify completed count math
  - delete a subtask and verify list count update
  - delete parent todo and verify subtask cascade behavior

## Status
- Implementation: Complete
- Verification: Complete (E2E passing)
- Last updated: 2026-05-29
