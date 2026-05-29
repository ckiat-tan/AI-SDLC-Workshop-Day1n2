import type { ExportPayload } from '@/lib/db';

type ValidationResult = {
  ok: true;
  payload: ExportPayload;
} | {
  ok: false;
  error: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateExportPayload(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: 'Invalid import format. Payload must be a JSON object.' };
  }

  const payload = value as Record<string, unknown>;

  if (typeof payload.version !== 'string') {
    return { ok: false, error: 'Invalid import format. Missing version string.' };
  }

  if (!Array.isArray(payload.todos)) {
    return { ok: false, error: 'Invalid import format. todos must be an array.' };
  }

  if (!Array.isArray(payload.subtasks)) {
    return { ok: false, error: 'Invalid import format. subtasks must be an array.' };
  }

  if (!Array.isArray(payload.tags)) {
    return { ok: false, error: 'Invalid import format. tags must be an array.' };
  }

  if (!Array.isArray(payload.todoTags)) {
    return { ok: false, error: 'Invalid import format. todoTags must be an array.' };
  }

  for (const [index, todo] of payload.todos.entries()) {
    if (!isRecord(todo) || !isFiniteNumber(todo.id) || typeof todo.title !== 'string') {
      return {
        ok: false,
        error: `Invalid import format. todos[${index}] must include numeric id and string title.`,
      };
    }
  }

  for (const [index, subtask] of payload.subtasks.entries()) {
    if (!isRecord(subtask) || !isFiniteNumber(subtask.todo_id) || typeof subtask.title !== 'string') {
      return {
        ok: false,
        error: `Invalid import format. subtasks[${index}] must include numeric todo_id and string title.`,
      };
    }
  }

  for (const [index, tag] of payload.tags.entries()) {
    if (!isRecord(tag) || !isFiniteNumber(tag.id) || typeof tag.name !== 'string') {
      return {
        ok: false,
        error: `Invalid import format. tags[${index}] must include numeric id and string name.`,
      };
    }
  }

  for (const [index, relation] of payload.todoTags.entries()) {
    if (
      !isRecord(relation) ||
      !isFiniteNumber(relation.todo_id) ||
      !isFiniteNumber(relation.tag_id)
    ) {
      return {
        ok: false,
        error: `Invalid import format. todoTags[${index}] must include numeric todo_id and tag_id.`,
      };
    }
  }

  return {
    ok: true,
    payload: value as ExportPayload,
  };
}
