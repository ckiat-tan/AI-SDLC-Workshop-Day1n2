'use client';

import { useEffect, useMemo, useState } from 'react';

export type NotificationTodo = {
  id: number;
  title: string;
  due_date: string;
  reminder_minutes: number;
};

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  async function enableNotifications(): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
  }

  useEffect(() => {
    if (permission !== 'granted') {
      return;
    }

    const runCheck = async (): Promise<void> => {
      const response = await fetch('/api/notifications/check', {
        cache: 'no-store',
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { notifications: NotificationTodo[] };

      for (const todo of data.notifications ?? []) {
        new Notification(`Reminder: ${todo.title}`, {
          body: `Due at ${new Date(todo.due_date).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}`,
          tag: `todo-${todo.id}`,
        });
      }
    };

    void runCheck();
    const interval = window.setInterval(() => {
      void runCheck();
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [permission]);

  return useMemo(
    () => ({
      permission,
      enableNotifications,
      enabled: permission === 'granted',
    }),
    [permission],
  );
}
