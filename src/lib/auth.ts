export const AUTH_STORAGE_KEY = 'endsem-insights-auth-v1';
export const CORRECT_PASSWORD = 'admin@123';

/**
 * Checks whether an authenticated session exists in localStorage or sessionStorage.
 */
export function checkIsAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const local = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (local === 'true' || local === 'authenticated') return true;
    const session = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (session === 'true' || session === 'authenticated') return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Persists authenticated status in storage.
 */
export function setAuthenticated(remember: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    if (remember) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    } else {
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
    }
  } catch {
    // Ignore quota or private-mode restrictions
  }
}

/**
 * Clears the authenticated session from both storage layers.
 */
export function clearAuthenticated(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Validates the entered password against the authorized portal secret.
 */
export function validatePassword(password: string): boolean {
  return password.trim() === CORRECT_PASSWORD;
}
