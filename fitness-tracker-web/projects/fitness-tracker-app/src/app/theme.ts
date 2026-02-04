export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'theme';
const DARK_MODE_CLASS = 'dark-mode';
const LIGHT_MODE_CLASS = 'light-mode';

export function resolveTheme(defaultMode: ThemeMode = 'dark'): ThemeMode {
  return getStoredTheme() ?? defaultMode;
}

export function getStoredTheme(): ThemeMode | null {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);

  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  return null;
}

export function setStoredTheme(mode: ThemeMode): void {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function applyTheme(mode: ThemeMode): void {
  document.body.classList.remove(DARK_MODE_CLASS, LIGHT_MODE_CLASS);
  document.body.classList.add(mode === 'dark' ? DARK_MODE_CLASS : LIGHT_MODE_CLASS);
}
