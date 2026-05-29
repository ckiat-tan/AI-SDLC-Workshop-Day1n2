# Feature 06 - Tag System

## Objective
Enable categorical organization through reusable, color-coded tags and tag-based filtering.

## Implemented Capabilities
- Create, edit, and delete tags.
- Enforce uniqueness for tag names per user.
- Assign and unassign tags from todos.
- Filter todos by tag ID.
- Remove tag associations when a tag is deleted.

## API Surface
- GET /api/tags
- POST /api/tags
- PUT /api/tags/:id
- DELETE /api/tags/:id
- POST /api/todos/:id/tags
- DELETE /api/todos/:id/tags
- GET /api/todos?tagId=<id>

## Data Model Touchpoints
- tags table stores label metadata (name, color).
- todo_tags junction table stores many-to-many relations.

## Validation Rules
- duplicate tag names are rejected.
- tag relation operations require valid todo and tag IDs.

## Verification
- Playwright spec: tests/06-tag-system.spec.ts
- Covered scenarios:
  - create two tags
  - reject duplicate tag name
  - update tag name and color
  - assign multiple tags to todo
  - filter todos by tag
  - remove one relation
  - delete tag and verify cleanup from todo payload

## Status
- Implementation: Complete
- Verification: Complete (E2E passing)
- Last updated: 2026-05-29
