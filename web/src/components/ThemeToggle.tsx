import { useState } from 'react';
import { fr } from '../i18n/fr';
import { getTheme, setTheme, type Theme } from '../lib/theme';

export function ThemeToggle() {
  const [theme, setCurrent] = useState<Theme>(getTheme());
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? fr.theme.toDark : fr.theme.toLight;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        setTheme(next);
        setCurrent(next);
      }}
      className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-line bg-surface text-2xl"
    >
      <span aria-hidden="true">{next === 'dark' ? fr.icons.themeDark : fr.icons.themeLight}</span>
    </button>
  );
}
