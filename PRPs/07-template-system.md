# Feature 07 - Template System

## Objective
Allow users to save repeatable todo structures and instantiate new todos from reusable templates.

## Implemented Capabilities
- Save template from an existing todo.
- Store template metadata: name, description, category.
- Persist and reuse todo settings (priority, recurrence, reminders).
- Recreate related subtasks when using a template.
- Reapply tags when using a template.
- Update and delete templates.

## API Surface
- GET /api/templates
- POST /api/templates
- PUT /api/templates/:id
- DELETE /api/templates/:id
- POST /api/templates/:id/use

## Data Model Touchpoints
- templates table for serialized template definitions.
- references to todo settings and related nested data.

## Validation Rules
- template creation requires a source todo and template name.
- template usage requires valid template ID.

## Verification
- Playwright spec: tests/07-template-system.spec.ts
- Covered scenarios:
  - create source todo with metadata and tag
  - add source subtasks
  - save source as template
  - use template to create new todo
  - verify recreated subtasks and tags
  - update template fields
  - delete template and verify removal from listing

## Status
- Implementation: Complete
- Verification: Complete (E2E passing)
- Last updated: 2026-05-29
