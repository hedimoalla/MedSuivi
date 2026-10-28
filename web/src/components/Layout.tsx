import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { PATIENT_NAME } from '@medsuivi/shared';
import { fr } from '../i18n/fr';
import { apiFetch } from '../api/client';
import { ThemeToggle } from './ThemeToggle';
import { InstallButton } from './InstallButton';
import { AlertsToggle } from './AlertsToggle';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-center text-base font-semibold transition-colors ${
    isActive
      ? 'bg-accent text-accent-fg shadow-md'
      : 'bg-surface text-fg shadow-sm hover:bg-surface-2'
  }`;

export function Layout({ children }: { children: ReactNode }) {
  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-10 pt-4">
      <header className="flex items-center justify-between gap-3 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-3xl"
          >
            {fr.icons.app}
          </span>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{fr.app.name}</h1>
            <p className="text-base text-muted">{fr.app.patientLine(PATIENT_NAME)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            className="flex min-h-12 items-center gap-2 rounded-full border-2 border-line bg-surface px-4 text-base font-semibold"
          >
            <span aria-hidden="true">{fr.icons.logout}</span>
            <span className="hidden sm:inline">{fr.nav.logout}</span>
          </button>
        </div>
      </header>

      <nav
        className="sticky top-0 z-10 -mx-4 mb-6 flex gap-2 bg-page/95 px-4 py-3 backdrop-blur"
        aria-label="Navigation principale"
      >
        <NavLink to="/" end className={navClass}>
          <span aria-hidden="true" className="text-2xl">
            {fr.icons.today}
          </span>
          {fr.nav.today}
        </NavLink>
        <NavLink to="/medicaments" className={navClass}>
          <span aria-hidden="true" className="text-2xl">
            {fr.icons.medications}
          </span>
          {fr.nav.medications}
        </NavLink>
        <NavLink to="/historique" className={navClass}>
          <span aria-hidden="true" className="text-2xl">
            {fr.icons.history}
          </span>
          {fr.nav.history}
        </NavLink>
      </nav>

      <div className="flex flex-col gap-3 print:hidden pb-4">
        <InstallButton />
        <AlertsToggle />
      </div>

      <main className="flex-1">{children}</main>

      <footer className="mt-10 flex gap-3 rounded-2xl bg-surface-2 p-4 text-base text-muted print:hidden">
        <span aria-hidden="true" className="text-xl">
          {fr.icons.info}
        </span>
        <p>{fr.app.disclaimer}</p>
      </footer>
    </div>
  );
}
