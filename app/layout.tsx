import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI-SDLC Todo App',
  description: 'Feature-complete todo app for workshop evaluation',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
