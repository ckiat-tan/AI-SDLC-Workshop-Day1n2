# Feature 08 - Search and Filtering

## Objective
Provide fast, combined filtering so users can narrow large todo lists by text, priority, and tags.

## Implemented Capabilities
- Case-insensitive text search.
- Search matches todo titles.
- Search matches tag names linked to todos.
- Priority filtering.
- Tag filtering via tag ID.
- Combined filter logic using AND semantics.

## API Surface
- GET /api/todos?search=<term>
- GET /api/todos?priority=<level>
- GET /api/todos?tagId=<id>
- GET /api/todos?search=<term>&priority=<level>&tagId=<id>

## Data Model Touchpoints
- todos.title used in search matching.
- tags.name used in search matching through todo_tags join.
- todos.priority used for priority filtering.

## Validation Rules
- search queries are treated case-insensitively.
- multiple filters are applied together as AND.

## Verification
- Playwright spec: tests/08-search-filtering.spec.ts
- Covered scenarios:
  - create tagged work and home todos
  - search by uppercase title term
  - search by lowercase tag term
  - apply combined search + priority + tag filters
  - verify no-results behavior for conflicting filters

## Status
- Implementation: Complete
- Verification: Complete (E2E passing)
- Last updated: 2026-05-29
