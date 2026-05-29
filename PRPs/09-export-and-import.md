# Feature 09 - Export and Import

## Objective
Support portable backup and restore for todos while preserving relationships between todos, subtasks, and tags.

## Implemented Capabilities
- Export all todo data in structured JSON.
- Include version marker for payload compatibility.
- Include todos, subtasks, tags, and todo-tag associations.
- Validate import payload structure.
- Restore data and rebuild relationships.
- Prevent duplicate tag creation on repeated imports.

## API Surface
- GET /api/todos/export
- POST /api/todos/import

## Data Model Touchpoints
- todos
- subtasks
- tags
- todo_tags

## Validation Rules
- import payload must match expected schema.
- invalid payloads return validation errors.
- repeated imports reuse existing tags when names conflict.

## Verification
- Playwright spec: tests/09-export-import.spec.ts
- Covered scenarios:
  - create todo with tag and subtask
  - export full payload and verify non-empty sections
  - reject invalid import payload
  - clear user data and import valid payload
  - verify restored todo, tags, and subtasks
  - import same payload again and verify no new tags created

## Status
- Implementation: Complete
- Verification: Complete (E2E passing)
- Last updated: 2026-05-29
