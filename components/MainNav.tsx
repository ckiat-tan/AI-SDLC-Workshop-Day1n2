'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

type MainNavProps = {
  title?: string;
};

export default function MainNav({ title = 'Todo App' }: MainNavProps) {
  const router = useRouter();

  async function logout(): Promise<void> {
    await fetch('/api/auth/logout', {
      method: 'POST',
    });

    router.push('/login');
    router.refresh();
  }

  return (
    <header className="card" style={{ padding: '0.9rem 1rem', marginBottom: '1rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{title}</strong>
        </div>
        <div className="row" style={{ alignItems: 'center' }}>
          <Link className="btn" href="/">
            Todos
          </Link>
          <Link className="btn" href="/calendar">
            Calendar
          </Link>
          <button className="btn danger" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
