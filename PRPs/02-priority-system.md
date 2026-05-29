# Feature 02 - Priority System

## Objective
Add priority-driven planning so users can rank tasks and focus on critical work first.

## Implemented Capabilities
- Support three priority levels: high, medium, low.
- Set default priority to medium.
- Set priority during create and update flows.
- Sort todo lists by priority order high to low.
- Filter todos by priority.
- Render priority badges in UI.

## API Surface
- POST /api/todos (accepts priority)
- PUT /api/todos/:id (updates priority)
- GET /api/todos?priority=<level>

## Data Model Touchpoints
- todos.priority column stores priority state.

## Validation Rules
- priority must be one of high, medium, or low.
- missing priority falls back to medium.

## Verification
- Playwright spec: tests/02-priority-system.spec.ts
- Covered scenarios:
  - create high, medium, and low priority todos
  - verify sort order high > medium > low
  - update a todo from low to high priority
  - filter list by high priority

## Status
- Implementation: Complete
- Verification: Complete (E2E passing)
- Last updated: 2026-05-29
