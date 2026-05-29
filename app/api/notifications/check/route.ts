import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const now = getSingaporeNow();
  const dueTodos = todoDB.listForNotifications(session.userId);

  const notifications = dueTodos.filter((todo) => {
    if (!todo.due_date || todo.reminder_minutes === null) {
      return false;
    }

    const due = new Date(todo.due_date).getTime();
    const reminderAt = due - todo.reminder_minutes * 60 * 1000;

    if (now.getTime() < reminderAt) {
      return false;
    }

    if (todo.last_notification_sent) {
      return false;
    }

    return true;
  });

  const sentAt = now.toISOString();
  for (const todo of notifications) {
    todoDB.markNotificationSent(session.userId, todo.id, sentAt);
  }

  return NextResponse.json({
    notifications: notifications.map((todo) => ({
      id: todo.id,
      title: todo.title,
      due_date: todo.due_date,
      reminder_minutes: todo.reminder_minutes,
    })),
  });
}
