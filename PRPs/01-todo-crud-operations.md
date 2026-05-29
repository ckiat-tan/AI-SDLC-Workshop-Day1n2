# Feature 01 - Todo CRUD Operations

## Objective
Implement full create, read, update, and delete lifecycle for todos with strong validation and clear state transitions.

## Implemented Capabilities
- Create todo with minimal payload (title only).
- Create todo with metadata (description, priority, due date, recurring, reminder).
- Read all todos and read one todo by ID.
- Update fields including title, priority, and completion state.
- Delete todo by ID.
- Group todos into Overdue, Active, and Completed views in UI.
- Support completion toggling in UI and API.
- Cascade cleanup of linked child records on delete.

## API Surface
- POST /api/todos
- GET /api/todos
- GET /api/todos/:id
- PUT /api/todos/:id
- DELETE /api/todos/:id

## Data Model Touchpoints
- todos table for core task records.
- linked subtasks and tag relations are removed when a parent todo is deleted.

## Validation Rules
- title is required, trimmed, and non-empty.
- due_date must be at least 1 minute in the future.

## Verification
- Playwright spec: tests/01-todo-crud.spec.ts
- Covered scenarios:
  - create minimal and metadata-rich todos
  - list and read single todo
  - update title and priority
  - mark complete
  - delete and verify not found
  - reject blank title
  - reject past due date

## Status
- Implementation: Complete
- Verification: Complete (E2E passing)
- Last updated: 2026-05-29
