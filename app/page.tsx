'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import MainNav from '@/components/MainNav';
import type { Priority, RecurrencePattern, Tag, Template, Todo } from '@/lib/db';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { formatSingaporeDate, parseDateTimeLocalToSingaporeISO, toDateTimeLocalFromISO } from '@/lib/timezone';

type TodoFormState = {
  title: string;
  description: string;
  priority: Priority;
  dueDateLocal: string;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  reminderMinutes: string;
  selectedTagIds: number[];
};

const reminderOptions = [
  { label: 'No reminder', value: '' },
  { label: '15 minutes before', value: '15' },
  { label: '30 minutes before', value: '30' },
  { label: '1 hour before', value: '60' },
  { label: '2 hours before', value: '120' },
  { label: '1 day before', value: '1440' },
  { label: '2 days before', value: '2880' },
  { label: '1 week before', value: '10080' },
];

function getEmptyForm(): TodoFormState {
  return {
    title: '',
    description: '',
    priority: 'medium',
    dueDateLocal: '',
    isRecurring: false,
    recurrencePattern: 'daily',
    reminderMinutes: '',
    selectedTagIds: [],
  };
}

function splitTodosBySection(todos: Todo[]) {
  const now = Date.now();

  const overdue: Todo[] = [];
  const active: Todo[] = [];
  const completed: Todo[] = [];

  for (const todo of todos) {
    if (todo.is_completed) {
      completed.push(todo);
      continue;
    }

    if (todo.due_date && new Date(todo.due_date).getTime() < now) {
      overdue.push(todo);
      continue;
    }

    active.push(todo);
  }

  return { overdue, active, completed };
}

function getProgress(todo: Todo): { completed: number; total: number; percent: number } {
  const total = todo.subtasks.length;
  const completed = todo.subtasks.filter((subtask) => subtask.is_completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    completed,
    total,
    percent,
  };
}

function toApiPayload(form: TodoFormState) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    priority: form.priority,
    due_date: parseDateTimeLocalToSingaporeISO(form.dueDateLocal),
    is_recurring: form.isRecurring,
    recurrence_pattern: form.isRecurring ? form.recurrencePattern : null,
    reminder_minutes: form.reminderMinutes ? Number(form.reminderMinutes) : null,
    tagIds: form.selectedTagIds,
  };
}

function todoToForm(todo: Todo): TodoFormState {
  return {
    title: todo.title,
    description: todo.description || '',
    priority: todo.priority,
    dueDateLocal: toDateTimeLocalFromISO(todo.due_date),
    isRecurring: todo.is_recurring,
    recurrencePattern: todo.recurrence_pattern || 'daily',
    reminderMinutes: todo.reminder_minutes ? String(todo.reminder_minutes) : '',
    selectedTagIds: todo.tags.map((tag) => tag.id),
  };
}

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [userName, setUserName] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [form, setForm] = useState<TodoFormState>(getEmptyForm());
  const [saving, setSaving] = useState(false);

  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editForm, setEditForm] = useState<TodoFormState>(getEmptyForm());

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<number | null>(null);

  const [expandedTodoIds, setExpandedTodoIds] = useState<number[]>([]);
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<number, string>>({});

  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingTagColor, setEditingTagColor] = useState('#3b82f6');

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');

  const [feedback, setFeedback] = useState<string | null>(null);

  const notifications = useNotifications();

  const hasActiveFilters =
    Boolean(debouncedSearch.trim()) || priorityFilter !== 'all' || selectedTagFilter !== null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([fetchMe(), fetchTodos(), fetchTags(), fetchTemplates()]);
    };

    void bootstrap();
  }, []);

  async function fetchMe() {
    const response = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { user: { username: string } };
    setUserName(data.user.username);
  }

  async function fetchTodos() {
    const response = await fetch('/api/todos', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { todos: Todo[] };
    setTodos(data.todos);
  }

  async function fetchTags() {
    const response = await fetch('/api/tags', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { tags: Tag[] };
    setTags(data.tags);
  }

  async function fetchTemplates() {
    const response = await fetch('/api/templates', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { templates: Template[] };
    setTemplates(data.templates);
  }

  const filteredTodos = useMemo(() => {
    let next = [...todos];

    if (debouncedSearch.trim()) {
      const normalized = debouncedSearch.toLowerCase().trim();
      next = next.filter((todo) => {
        const inTitle = todo.title.toLowerCase().includes(normalized);
        const inTags = todo.tags.some((tag) => tag.name.toLowerCase().includes(normalized));
        return inTitle || inTags;
      });
    }

    if (priorityFilter !== 'all') {
      next = next.filter((todo) => todo.priority === priorityFilter);
    }

    if (selectedTagFilter !== null) {
      next = next.filter((todo) => todo.tags.some((tag) => tag.id === selectedTagFilter));
    }

    return next;
  }, [debouncedSearch, priorityFilter, selectedTagFilter, todos]);

  const sections = useMemo(() => splitTodosBySection(filteredTodos), [filteredTodos]);

  const filteredTemplates = useMemo(() => {
    if (templateCategoryFilter === 'all') {
      return templates;
    }

    return templates.filter((template) => (template.category || 'uncategorized') === templateCategoryFilter);
  }, [templateCategoryFilter, templates]);

  const templateCategories = useMemo(() => {
    const set = new Set<string>();
    for (const template of templates) {
      set.add(template.category || 'uncategorized');
    }

    return ['all', ...Array.from(set)];
  }, [templates]);

  async function createTodo() {
    const payload = toApiPayload(form);

    if (!payload.title) {
      setFeedback('Title cannot be empty.');
      return;
    }

    if (payload.reminder_minutes && !payload.due_date) {
      setFeedback('Reminder requires due date.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    const optimisticId = -Date.now();
    const optimisticTodo: Todo = {
      id: optimisticId,
      user_id: 0,
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      due_date: payload.due_date,
      is_completed: false,
      is_recurring: payload.is_recurring,
      recurrence_pattern: payload.recurrence_pattern,
      reminder_minutes: payload.reminder_minutes,
      last_notification_sent: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: tags.filter((tag) => payload.tagIds.includes(tag.id)),
      subtasks: [],
    };

    setTodos((prev) => [optimisticTodo, ...prev]);

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create todo');
      }

      const created = data.todo as Todo;
      setTodos((prev) => prev.map((todo) => (todo.id === optimisticId ? created : todo)));
      setForm(getEmptyForm());
    } catch (error) {
      setTodos((prev) => prev.filter((todo) => todo.id !== optimisticId));
      setFeedback(error instanceof Error ? error.message : 'Failed to create todo');
    } finally {
      setSaving(false);
    }
  }

  async function saveEditTodo() {
    if (!editingTodo) {
      return;
    }

    const payload = toApiPayload(editForm);
    if (!payload.title) {
      setFeedback('Title cannot be empty.');
      return;
    }

    const response = await fetch(`/api/todos/${editingTodo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      setFeedback(data.error || 'Failed to update todo');
      return;
    }

    const updated = data.todo as Todo;
    setTodos((prev) => prev.map((todo) => (todo.id === updated.id ? updated : todo)));
    setEditingTodo(null);
    setFeedback(null);
  }

  async function deleteTodo(todo: Todo) {
    const confirmed = window.confirm(`Delete "${todo.title}"? This also deletes subtasks and tag links.`);
    if (!confirmed) {
      return;
    }

    const previous = [...todos];
    setTodos((prev) => prev.filter((item) => item.id !== todo.id));

    const response = await fetch(`/api/todos/${todo.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      setTodos(previous);
      const data = await response.json();
      setFeedback(data.error || 'Failed to delete todo');
    }
  }

  async function toggleTodoCompletion(todo: Todo, checked: boolean) {
    const previous = [...todos];
    setTodos((prev) => prev.map((item) => (item.id === todo.id ? { ...item, is_completed: checked } : item)));

    const response = await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: checked }),
    });

    const data = await response.json();
    if (!response.ok) {
      setTodos(previous);
      setFeedback(data.error || 'Failed to toggle completion');
      return;
    }

    const updated = data.todo as Todo;
    const nextRecurringTodo = (data.nextRecurringTodo || null) as Todo | null;

    setTodos((prev) => {
      let next = prev.map((item) => (item.id === updated.id ? updated : item));
      if (nextRecurringTodo) {
        next = [nextRecurringTodo, ...next];
      }
      return next;
    });
  }

  async function addSubtask(todoId: number) {
    const title = (subtaskDrafts[todoId] || '').trim();
    if (!title) {
      return;
    }

    const response = await fetch(`/api/todos/${todoId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    const data = await response.json();
    if (!response.ok) {
      setFeedback(data.error || 'Failed to add subtask');
      return;
    }

    const created = data.subtask;

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === todoId ? { ...todo, subtasks: [...todo.subtasks, created] } : todo,
      ),
    );

    setSubtaskDrafts((prev) => ({
      ...prev,
      [todoId]: '',
    }));
  }

  async function toggleSubtask(todoId: number, subtaskId: number, checked: boolean) {
    const previous = [...todos];

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              subtasks: todo.subtasks.map((subtask) =>
                subtask.id === subtaskId ? { ...subtask, is_completed: checked } : subtask,
              ),
            }
          : todo,
      ),
    );

    const response = await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: checked }),
    });

    if (!response.ok) {
      setTodos(previous);
      const data = await response.json();
      setFeedback(data.error || 'Failed to update subtask');
    }
  }

  async function deleteSubtask(todoId: number, subtaskId: number) {
    const previous = [...todos];

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              subtasks: todo.subtasks.filter((subtask) => subtask.id !== subtaskId),
            }
          : todo,
      ),
    );

    const response = await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });

    if (!response.ok) {
      setTodos(previous);
      const data = await response.json();
      setFeedback(data.error || 'Failed to delete subtask');
    }
  }

  async function createTag() {
    const name = newTagName.trim();
    if (!name) {
      setFeedback('Tag name is required.');
      return;
    }

    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color: newTagColor }),
    });

    const data = await response.json();
    if (!response.ok) {
      setFeedback(data.error || 'Failed to create tag');
      return;
    }

    setTags((prev) => [...prev, data.tag as Tag]);
    setNewTagName('');
    setNewTagColor('#3b82f6');
  }

  async function saveTagEdit() {
    if (!editingTagId) {
      return;
    }

    const response = await fetch(`/api/tags/${editingTagId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editingTagName,
        color: editingTagColor,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setFeedback(data.error || 'Failed to update tag');
      return;
    }

    const updated = data.tag as Tag;
    setTags((prev) => prev.map((tag) => (tag.id === updated.id ? updated : tag)));

    setTodos((prev) =>
      prev.map((todo) => ({
        ...todo,
        tags: todo.tags.map((tag) => (tag.id === updated.id ? updated : tag)),
      })),
    );

    setEditingTagId(null);
  }

  async function removeTag(tagId: number) {
    const response = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
    const data = await response.json();

    if (!response.ok) {
      setFeedback(data.error || 'Failed to delete tag');
      return;
    }

    setTags((prev) => prev.filter((tag) => tag.id !== tagId));
    setTodos((prev) =>
      prev.map((todo) => ({
        ...todo,
        tags: todo.tags.filter((tag) => tag.id !== tagId),
      })),
    );

    if (selectedTagFilter === tagId) {
      setSelectedTagFilter(null);
    }
  }

  async function saveAsTemplate(todo: Todo) {
    const name = window.prompt('Template name');
    if (!name?.trim()) {
      return;
    }

    const description = window.prompt('Template description (optional)') || null;
    const category = window.prompt('Template category (optional)') || null;

    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        todoId: todo.id,
        name,
        description,
        category,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setFeedback(data.error || 'Failed to save template');
      return;
    }

    setTemplates((prev) => [data.template as Template, ...prev]);
    setFeedback('Template saved.');
  }

  async function applyTemplate(templateId: number) {
    const response = await fetch(`/api/templates/${templateId}/use`, {
      method: 'POST',
    });

    const data = await response.json();
    if (!response.ok) {
      setFeedback(data.error || 'Failed to use template');
      return;
    }

    const created = data.todo as Todo;
    setTodos((prev) => [created, ...prev]);
    setShowTemplateModal(false);
  }

  async function removeTemplate(templateId: number) {
    const response = await fetch(`/api/templates/${templateId}`, { method: 'DELETE' });
    const data = await response.json();

    if (!response.ok) {
      setFeedback(data.error || 'Failed to delete template');
      return;
    }

    setTemplates((prev) => prev.filter((template) => template.id !== templateId));
  }

  async function exportData() {
    const response = await fetch('/api/todos/export');
    const payload = await response.text();

    if (!response.ok) {
      setFeedback('Failed to export todos');
      return;
    }

    const blob = new Blob([payload], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `todos-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    window.URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      const response = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setFeedback(data.message || 'Import complete');
      await Promise.all([fetchTodos(), fetchTags()]);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Import failed');
    }
  }

  function toggleExpanded(todoId: number) {
    setExpandedTodoIds((prev) =>
      prev.includes(todoId) ? prev.filter((id) => id !== todoId) : [...prev, todoId],
    );
  }

  function clearFilters() {
    setSearchInput('');
    setDebouncedSearch('');
    setPriorityFilter('all');
    setSelectedTagFilter(null);
  }

  function priorityBadge(priority: Priority) {
    return <span className={`badge ${priority}`}>{priority.toUpperCase()}</span>;
  }

  return (
    <main className="page-shell">
      <MainNav title={userName ? `Todo App - ${userName}` : 'Todo App'} />

      <section className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Create Todo</h2>
          <div className="row">
            <button
              type="button"
              className={`btn ${notifications.enabled ? 'primary' : ''}`}
              onClick={notifications.enableNotifications}
              disabled={notifications.permission === 'denied'}
            >
              {notifications.enabled ? 'Notifications Enabled' : 'Enable Notifications'}
            </button>
            <button type="button" className="btn" onClick={() => setShowTagModal(true)}>
              Manage Tags
            </button>
            <button type="button" className="btn" onClick={() => setShowTemplateModal(true)}>
              Use Template
            </button>
            <button type="button" className="btn" onClick={exportData}>
              Export
            </button>
            <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importData(file);
                }

                event.currentTarget.value = '';
              }}
            />
          </div>
        </div>

        <div className="row" style={{ marginTop: '1rem' }}>
          <div style={{ flex: '2 1 260px' }}>
            <label className="label">Title</label>
            <input
              className="input"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="What needs to be done?"
            />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label className="label">Priority</label>
            <select
              className="select"
              value={form.priority}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  priority: event.target.value as Priority,
                }))
              }
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={{ flex: '1 1 190px' }}>
            <label className="label">Due Date (Singapore)</label>
            <input
              className="input"
              type="datetime-local"
              value={form.dueDateLocal}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDateLocal: event.target.value }))}
            />
          </div>
        </div>

        <div className="row" style={{ marginTop: '0.75rem' }}>
          <div style={{ flex: '1 1 210px' }}>
            <label className="label">Reminder</label>
            <select
              className="select"
              value={form.reminderMinutes}
              disabled={!form.dueDateLocal}
              onChange={(event) => setForm((prev) => ({ ...prev, reminderMinutes: event.target.value }))}
            >
              {reminderOptions.map((option) => (
                <option key={option.value || 'none'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 220px' }}>
            <label className="label" style={{ display: 'block' }}>
              Recurring
            </label>
            <div className="row" style={{ alignItems: 'center' }}>
              <label className="row" style={{ alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(event) => setForm((prev) => ({ ...prev, isRecurring: event.target.checked }))}
                />
                Repeat
              </label>

              <select
                className="select"
                style={{ width: 160 }}
                disabled={!form.isRecurring}
                value={form.recurrencePattern}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    recurrencePattern: event.target.value as RecurrencePattern,
                  }))
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div style={{ flex: '2 1 300px' }}>
            <label className="label" style={{ display: 'block' }}>
              Tags
            </label>
            <div className="row">
              {tags.length === 0 ? <span className="label">No tags yet</span> : null}
              {tags.map((tag) => {
                const checked = form.selectedTagIds.includes(tag.id);

                return (
                  <label key={tag.id} className="row" style={{ alignItems: 'center', gap: '0.35rem' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setForm((prev) => ({
                          ...prev,
                          selectedTagIds: event.target.checked
                            ? [...prev.selectedTagIds, tag.id]
                            : prev.selectedTagIds.filter((id) => id !== tag.id),
                        }));
                      }}
                    />
                    <span className="tag" style={{ background: `${tag.color}33`, borderColor: tag.color }}>
                      {tag.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <label className="label">Description</label>
          <textarea
            className="textarea"
            rows={2}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Optional details"
          />
        </div>

        <div className="row" style={{ marginTop: '0.8rem' }}>
          <button type="button" className="btn primary" onClick={createTodo} disabled={saving}>
            {saving ? 'Creating...' : 'Create Todo'}
          </button>
          <button type="button" className="btn" onClick={() => setForm(getEmptyForm())}>
            Reset
          </button>
        </div>

        {feedback ? (
          <p style={{ marginBottom: 0, color: '#8a0b00' }} role="alert">
            {feedback}
          </p>
        ) : null}
      </section>

      <section className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div className="row" style={{ alignItems: 'end' }}>
          <div style={{ flex: '2 1 300px' }}>
            <label className="label">Search (title + tags)</label>
            <input
              className="input"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search todos..."
            />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label className="label">Priority Filter</label>
            <select
              className="select"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as 'all' | Priority)}
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <label className="label">Tag Filter</label>
            <select
              className="select"
              value={selectedTagFilter ?? ''}
              onChange={(event) =>
                setSelectedTagFilter(event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">All Tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        <div className="row" style={{ marginTop: '0.6rem', alignItems: 'center' }}>
          <span className="label">Filter Summary:</span>
          <span className="badge" style={{ background: '#eef4ff' }}>
            Search: {debouncedSearch.trim() || 'none'}
          </span>
          <span className="badge" style={{ background: '#eef4ff' }}>
            Priority: {priorityFilter}
          </span>
          <span className="badge" style={{ background: '#eef4ff' }}>
            Tag: {selectedTagFilter ? tags.find((tag) => tag.id === selectedTagFilter)?.name || 'unknown' : 'all'}
          </span>
        </div>
      </section>

      {filteredTodos.length === 0 ? (
        <section className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <h3 style={{ marginTop: 0 }}>No Todos Found</h3>
          <p style={{ marginBottom: 0 }}>
            {hasActiveFilters
              ? 'No todo matches your current search/filter combination.'
              : 'Create your first todo above.'}
          </p>
        </section>
      ) : null}

      {(
        [
          { title: 'Overdue', key: 'overdue', items: sections.overdue },
          { title: 'Active', key: 'active', items: sections.active },
          { title: 'Completed', key: 'completed', items: sections.completed },
        ] as const
      ).map((section) => (
        <section key={section.key} className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>{section.title}</h3>
          {section.items.length === 0 ? (
            <p className="label" style={{ marginBottom: 0 }}>
              No items in this section.
            </p>
          ) : null}

          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {section.items.map((todo) => {
              const expanded = expandedTodoIds.includes(todo.id);
              const progress = getProgress(todo);

              return (
                <article key={todo.id} className="card" style={{ padding: '0.8rem', borderRadius: 12 }}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: '1 1 260px' }}>
                      <label className="row" style={{ alignItems: 'center', marginBottom: '0.25rem' }}>
                        <input
                          type="checkbox"
                          checked={todo.is_completed}
                          onChange={(event) => {
                            void toggleTodoCompletion(todo, event.target.checked);
                          }}
                        />
                        <strong style={{ textDecoration: todo.is_completed ? 'line-through' : 'none' }}>
                          {todo.title}
                        </strong>
                      </label>

                      {todo.description ? (
                        <p className="label" style={{ marginTop: 0, marginBottom: '0.4rem' }}>
                          {todo.description}
                        </p>
                      ) : null}

                      <div className="row" style={{ alignItems: 'center' }}>
                        {priorityBadge(todo.priority)}
                        {todo.is_recurring ? (
                          <span className="badge" style={{ background: '#e8f7ef' }}>
                            🔄 {todo.recurrence_pattern}
                          </span>
                        ) : null}
                        {todo.reminder_minutes ? (
                          <span className="badge" style={{ background: '#fff5e8' }}>
                            🔔 {todo.reminder_minutes}m
                          </span>
                        ) : null}
                        {todo.due_date ? (
                          <span className="badge" style={{ background: '#eef4ff' }}>
                            Due {formatSingaporeDate(todo.due_date)}
                          </span>
                        ) : null}
                      </div>

                      <div className="row" style={{ marginTop: '0.4rem' }}>
                        {todo.tags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            className="tag"
                            style={{
                              background: `${tag.color}33`,
                              borderColor: tag.color,
                              cursor: 'pointer',
                            }}
                            onClick={() => setSelectedTagFilter(tag.id)}
                            title="Click to filter by this tag"
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setEditingTodo(todo);
                          setEditForm(todoToForm(todo));
                        }}
                      >
                        Edit
                      </button>
                      <button type="button" className="btn" onClick={() => void saveAsTemplate(todo)}>
                        Save Template
                      </button>
                      <button type="button" className="btn danger" onClick={() => void deleteTodo(todo)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.6rem' }}>
                    <button type="button" className="btn" onClick={() => toggleExpanded(todo.id)}>
                      {expanded ? 'Hide Subtasks' : 'Show Subtasks'}
                    </button>
                  </div>

                  {expanded ? (
                    <div style={{ marginTop: '0.6rem' }}>
                      <div className="row" style={{ alignItems: 'center' }}>
                        <div style={{ flex: 1 }} className="progress-wrap">
                          <div
                            className={`progress-bar ${progress.percent === 100 ? 'done' : ''}`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                        <span className="label">
                          {progress.completed}/{progress.total} completed ({progress.percent}%)
                        </span>
                      </div>

                      <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.45rem' }}>
                        {todo.subtasks.map((subtask) => (
                          <div key={subtask.id} className="row" style={{ alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={subtask.is_completed}
                              onChange={(event) =>
                                void toggleSubtask(todo.id, subtask.id, event.target.checked)
                              }
                            />
                            <span
                              style={{
                                textDecoration: subtask.is_completed ? 'line-through' : 'none',
                                flex: 1,
                              }}
                            >
                              {subtask.title}
                            </span>
                            <button
                              type="button"
                              className="btn danger"
                              onClick={() => void deleteSubtask(todo.id, subtask.id)}
                            >
                              Delete
                            </button>
                          </div>
                        ))}

                        <div className="row" style={{ alignItems: 'center' }}>
                          <input
                            className="input"
                            value={subtaskDrafts[todo.id] || ''}
                            placeholder="Add subtask"
                            onChange={(event) =>
                              setSubtaskDrafts((prev) => ({
                                ...prev,
                                [todo.id]: event.target.value,
                              }))
                            }
                          />
                          <button type="button" className="btn" onClick={() => void addSubtask(todo.id)}>
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {showTagModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Manage Tags</h3>
              <button type="button" className="btn" onClick={() => setShowTagModal(false)}>
                Close
              </button>
            </div>

            <div className="row" style={{ marginTop: '0.8rem', alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label className="label">Tag Name</label>
                <input
                  className="input"
                  value={newTagName}
                  onChange={(event) => setNewTagName(event.target.value)}
                />
              </div>
              <div>
                <label className="label">Color</label>
                <input
                  className="input"
                  type="color"
                  value={newTagColor}
                  onChange={(event) => setNewTagColor(event.target.value)}
                />
              </div>
              <button type="button" className="btn primary" onClick={() => void createTag()}>
                Create Tag
              </button>
            </div>

            <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.55rem' }}>
              {tags.map((tag) => (
                <div key={tag.id} className="card" style={{ padding: '0.6rem' }}>
                  {editingTagId === tag.id ? (
                    <div className="row" style={{ alignItems: 'end' }}>
                      <div style={{ flex: 1 }}>
                        <label className="label">Name</label>
                        <input
                          className="input"
                          value={editingTagName}
                          onChange={(event) => setEditingTagName(event.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">Color</label>
                        <input
                          className="input"
                          type="color"
                          value={editingTagColor}
                          onChange={(event) => setEditingTagColor(event.target.value)}
                        />
                      </div>
                      <button type="button" className="btn primary" onClick={() => void saveTagEdit()}>
                        Save
                      </button>
                      <button type="button" className="btn" onClick={() => setEditingTagId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="tag" style={{ background: `${tag.color}33`, borderColor: tag.color }}>
                        {tag.name}
                      </span>
                      <div className="row">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setEditingTagId(tag.id);
                            setEditingTagName(tag.name);
                            setEditingTagColor(tag.color);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => void removeTag(tag.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showTemplateModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Templates</h3>
              <button type="button" className="btn" onClick={() => setShowTemplateModal(false)}>
                Close
              </button>
            </div>

            <div style={{ marginTop: '0.8rem' }}>
              <label className="label">Category Filter</label>
              <select
                className="select"
                value={templateCategoryFilter}
                onChange={(event) => setTemplateCategoryFilter(event.target.value)}
              >
                {templateCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '0.8rem', display: 'grid', gap: '0.6rem' }}>
              {filteredTemplates.map((template) => {
                const subtasks = JSON.parse(template.subtasks_json || '[]') as Array<{ title: string }>;
                const tagNames = JSON.parse(template.tag_names_json || '[]') as string[];

                return (
                  <article key={template.id} className="card" style={{ padding: '0.7rem' }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <div>
                        <strong>{template.name}</strong>
                        <p className="label" style={{ marginTop: '0.2rem', marginBottom: '0.3rem' }}>
                          Category: {template.category || 'uncategorized'}
                        </p>
                        <p className="label" style={{ marginTop: 0, marginBottom: '0.3rem' }}>
                          Todo: {template.title}
                        </p>
                        <div className="row">
                          <span className={`badge ${template.priority}`}>{template.priority.toUpperCase()}</span>
                          {template.is_recurring ? (
                            <span className="badge" style={{ background: '#e8f7ef' }}>
                              🔄 {template.recurrence_pattern}
                            </span>
                          ) : null}
                          {template.reminder_minutes ? (
                            <span className="badge" style={{ background: '#fff5e8' }}>
                              🔔 {template.reminder_minutes}m
                            </span>
                          ) : null}
                        </div>
                        <p className="label" style={{ marginBottom: 0 }}>
                          Subtasks: {subtasks.map((subtask) => subtask.title).join(', ') || 'none'}
                        </p>
                        <p className="label" style={{ marginBottom: 0 }}>
                          Tags: {tagNames.join(', ') || 'none'}
                        </p>
                      </div>
                      <div className="row">
                        <button
                          type="button"
                          className="btn primary"
                          onClick={() => void applyTemplate(template.id)}
                        >
                          Use
                        </button>
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => void removeTemplate(template.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              {filteredTemplates.length === 0 ? (
                <p className="label" style={{ marginBottom: 0 }}>
                  No templates available for this category.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {editingTodo ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Edit Todo</h3>
              <button type="button" className="btn" onClick={() => setEditingTodo(null)}>
                Close
              </button>
            </div>

            <div className="row" style={{ marginTop: '0.8rem' }}>
              <div style={{ flex: '2 1 260px' }}>
                <label className="label">Title</label>
                <input
                  className="input"
                  value={editForm.title}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label className="label">Priority</label>
                <select
                  className="select"
                  value={editForm.priority}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      priority: event.target.value as Priority,
                    }))
                  }
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="row" style={{ marginTop: '0.8rem' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label className="label">Due Date</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={editForm.dueDateLocal}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      dueDateLocal: event.target.value,
                    }))
                  }
                />
              </div>
              <div style={{ flex: '1 1 170px' }}>
                <label className="label">Reminder</label>
                <select
                  className="select"
                  disabled={!editForm.dueDateLocal}
                  value={editForm.reminderMinutes}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      reminderMinutes: event.target.value,
                    }))
                  }
                >
                  {reminderOptions.map((option) => (
                    <option key={option.value || 'none'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '1 1 220px' }}>
                <label className="label" style={{ display: 'block' }}>
                  Recurring
                </label>
                <div className="row" style={{ alignItems: 'center' }}>
                  <label className="row" style={{ alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={editForm.isRecurring}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          isRecurring: event.target.checked,
                        }))
                      }
                    />
                    Repeat
                  </label>
                  <select
                    className="select"
                    style={{ width: 145 }}
                    disabled={!editForm.isRecurring}
                    value={editForm.recurrencePattern}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        recurrencePattern: event.target.value as RecurrencePattern,
                      }))
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '0.7rem' }}>
              <label className="label">Description</label>
              <textarea
                className="textarea"
                rows={3}
                value={editForm.description}
                onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div style={{ marginTop: '0.7rem' }}>
              <label className="label" style={{ display: 'block' }}>
                Tags
              </label>
              <div className="row">
                {tags.map((tag) => (
                  <label key={tag.id} className="row" style={{ alignItems: 'center', gap: '0.35rem' }}>
                    <input
                      type="checkbox"
                      checked={editForm.selectedTagIds.includes(tag.id)}
                      onChange={(event) => {
                        setEditForm((prev) => ({
                          ...prev,
                          selectedTagIds: event.target.checked
                            ? [...prev.selectedTagIds, tag.id]
                            : prev.selectedTagIds.filter((id) => id !== tag.id),
                        }));
                      }}
                    />
                    <span className="tag" style={{ background: `${tag.color}33`, borderColor: tag.color }}>
                      {tag.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="row" style={{ marginTop: '0.9rem' }}>
              <button type="button" className="btn primary" onClick={() => void saveEditTodo()}>
                Save Changes
              </button>
              <button type="button" className="btn" onClick={() => setEditingTodo(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
