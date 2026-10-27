export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'medsuivi-theme';

/** Le mode clair est le choix par défaut. Le choix est mémorisé sur cet appareil seulement. */
export function getTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Stockage indisponible (navigation privée) : le thème reste actif pour cette visite.
  }
}
