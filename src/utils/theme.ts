export type ThemePreference = 'light' | 'dark' | 'system';

const themeStorageKey = 'connect-theme-preference';

function getSystemTheme(): Exclude<ThemePreference, 'system'> {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getThemePreference(): ThemePreference {
  const storedTheme = localStorage.getItem(themeStorageKey);
  return storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'light';
}

export function applyThemePreference(theme: ThemePreference) {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themePreference = theme;
  localStorage.setItem(themeStorageKey, theme);
}

export function watchSystemTheme() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    if (getThemePreference() === 'system') {
      applyThemePreference('system');
    }
  };

  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}
