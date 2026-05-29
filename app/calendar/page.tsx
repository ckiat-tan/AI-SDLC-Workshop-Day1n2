'use client';

import { useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import MainNav from '@/components/MainNav';
import type { Todo } from '@/lib/db';
import { toSingaporeMonthKey } from '@/lib/timezone';

type Holiday = {
  id: number;
  date: string;
  name: string;
};

type CalendarDay = {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
};

function dateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKeyToDate(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map((value) => Number(value));
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
}

function shiftMonth(monthKey: string, delta: number): string {
  const date = monthKeyToDate(monthKey);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function buildCalendar(monthKey: string): CalendarDay[] {
  const first = monthKeyToDate(monthKey);
  const firstWeekday = first.getUTCDay();

  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - firstWeekday);

  const days: CalendarDay[] = [];

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    days.push({
      date,
      dateKey: dateToKey(date),
      inCurrentMonth: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}` === monthKey,
    });
  }

  return days;
}

export default function CalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const defaultMonth = toSingaporeMonthKey(new Date());
  const month = searchParams.get('month') || defaultMonth;

  useEffect(() => {
    const load = async () => {
      const [todoResponse, holidayResponse] = await Promise.all([
        fetch('/api/todos', { cache: 'no-store' }),
        fetch('/api/holidays', { cache: 'no-store' }),
      ]);

      if (todoResponse.ok) {
        const todoData = (await todoResponse.json()) as { todos: Todo[] };
        setTodos(todoData.todos);
      }

      if (holidayResponse.ok) {
        const holidayData = (await holidayResponse.json()) as { holidays: Holiday[] };
        setHolidays(holidayData.holidays);
      }
    };

    void load();
  }, []);

  const calendarDays = useMemo(() => buildCalendar(month), [month]);

  const holidaysMap = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const holiday of holidays) {
      map.set(holiday.date, holiday);
    }
    return map;
  }, [holidays]);

  const todosByDate = useMemo(() => {
    const map = new Map<string, Todo[]>();

    for (const todo of todos) {
      if (!todo.due_date) {
        continue;
      }

      const key = todo.due_date.slice(0, 10);
      const current = map.get(key) || [];
      current.push(todo);
      map.set(key, current);
    }

    return map;
  }, [todos]);

  const selectedDayTodos = selectedDay ? todosByDate.get(selectedDay) || [] : [];
  const selectedDayHoliday = selectedDay ? holidaysMap.get(selectedDay) || null : null;

  function setMonth(nextMonth: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set('month', nextMonth);
    router.replace(`${pathname}?${next.toString()}`);
  }

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <main className="page-shell">
      <MainNav title="Calendar View" />

      <section className="card" style={{ padding: '1rem' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Calendar</h2>
          <div className="row">
            <button type="button" className="btn" onClick={() => setMonth(shiftMonth(month, -1))}>
              Previous
            </button>
            <button type="button" className="btn" onClick={() => setMonth(defaultMonth)}>
              Today
            </button>
            <button type="button" className="btn" onClick={() => setMonth(shiftMonth(month, 1))}>
              Next
            </button>
          </div>
        </div>

        <p className="label" style={{ marginTop: '0.5rem' }}>
          Month key in URL: {month}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '0.4rem',
            marginTop: '0.7rem',
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
            <div key={label} className="card" style={{ padding: '0.5rem', fontWeight: 600, textAlign: 'center' }}>
              {label}
            </div>
          ))}

          {calendarDays.map((day) => {
            const holiday = holidaysMap.get(day.dateKey);
            const dayTodos = todosByDate.get(day.dateKey) || [];
            const isToday = day.dateKey === todayKey;
            const isWeekend = day.date.getUTCDay() === 0 || day.date.getUTCDay() === 6;

            return (
              <button
                key={`${day.dateKey}-${day.inCurrentMonth ? 'in' : 'out'}`}
                type="button"
                className="card"
                style={{
                  textAlign: 'left',
                  minHeight: 115,
                  borderColor: isToday ? '#006d77' : undefined,
                  background: !day.inCurrentMonth ? '#f6f3ea' : isWeekend ? '#f9fbff' : undefined,
                  opacity: day.inCurrentMonth ? 1 : 0.5,
                  padding: '0.45rem',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedDay(day.dateKey)}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{day.date.getUTCDate()}</strong>
                  {dayTodos.length > 0 ? (
                    <span className="badge" style={{ background: '#eef4ff' }}>
                      {dayTodos.length}
                    </span>
                  ) : null}
                </div>

                {holiday ? (
                  <p
                    style={{
                      margin: '0.35rem 0 0',
                      fontSize: '0.75rem',
                      color: '#8a0b00',
                      fontWeight: 600,
                    }}
                  >
                    {holiday.name}
                  </p>
                ) : null}

                {dayTodos.slice(0, 2).map((todo) => (
                  <p
                    key={todo.id}
                    style={{
                      margin: '0.25rem 0 0',
                      fontSize: '0.74rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    • {todo.title}
                  </p>
                ))}
              </button>
            );
          })}
        </div>
      </section>

      {selectedDay ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Todos on {selectedDay}</h3>
              <button type="button" className="btn" onClick={() => setSelectedDay(null)}>
                Close
              </button>
            </div>

            {selectedDayHoliday ? (
              <p style={{ color: '#8a0b00', fontWeight: 600 }}>
                Holiday: {selectedDayHoliday.name}
              </p>
            ) : null}

            {selectedDayTodos.length === 0 ? (
              <p className="label" style={{ marginBottom: 0 }}>
                No todos due on this day.
              </p>
            ) : null}

            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {selectedDayTodos.map((todo) => (
                <article key={todo.id} className="card" style={{ padding: '0.6rem', borderRadius: 12 }}>
                  <strong>{todo.title}</strong>
                  <div className="row" style={{ marginTop: '0.3rem' }}>
                    <span className={`badge ${todo.priority}`}>{todo.priority.toUpperCase()}</span>
                    {todo.is_completed ? (
                      <span className="badge" style={{ background: '#e8f7ef' }}>
                        Completed
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
