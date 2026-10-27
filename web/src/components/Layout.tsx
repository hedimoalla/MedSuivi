import type { ReactNode } from 'react';
import { fr } from '../i18n/fr';
import { apiFetch } from '../api/client';

export function Layout({ children }: { children: ReactNode }) {
  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-8 pt-4">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <h1 className="text-3xl font-bold">{fr.app.name}</h1>
        <button
          type="button"
          onClick={logout}
          className="min-h-14 rounded-xl border-2 border-current px-5 text-lg font-semibold"
        >
          {fr.nav.logout}
        </button>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="pt-8 text-lg text-[var(--color-muted)]">{fr.app.disclaimer}</footer>
    </div>
  );
}
