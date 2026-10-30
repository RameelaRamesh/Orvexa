'use client';

/**
 * Tab-level Session Isolation:
 * Isolates 'accessToken' and 'activeWorkspaceId' to each individual browser tab via sessionStorage.
 * This guarantees that multiple roles (Admin, Manager, Member) can be logged in simultaneously
 * across separate tabs of the same browser without overwriting or redirecting each other on refresh.
 */
export function initSessionIsolation() {
  if (typeof window === 'undefined' || !window.localStorage || !window.sessionStorage) return;

  const ISOLATED_KEYS = new Set(['accessToken', 'activeWorkspaceId']);

  // Prevent multiple wrapping
  if ((window as any).__sessionIsolated) return;
  (window as any).__sessionIsolated = true;

  const originalGetItem = localStorage.getItem.bind(localStorage);
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  localStorage.getItem = function (key: string): string | null {
    if (ISOLATED_KEYS.has(key)) {
      try {
        const sessionVal = sessionStorage.getItem(key);
        if (sessionVal !== null && sessionVal !== '') {
          return sessionVal;
        }
        // Fallback: If not present in sessionStorage, read from localStorage once and copy to sessionStorage
        const localVal = originalGetItem(key);
        if (localVal !== null && localVal !== '') {
          sessionStorage.setItem(key, localVal);
          return localVal;
        }
        return null;
      } catch {
        return originalGetItem(key);
      }
    }
    return originalGetItem(key);
  };

  localStorage.setItem = function (key: string, value: string): void {
    if (ISOLATED_KEYS.has(key)) {
      try {
        sessionStorage.setItem(key, value);
      } catch {}
      // Crucial: DO NOT write to shared localStorage!
      // This prevents a login in Tab B from overwriting Tab A's credentials.
      return;
    }
    originalSetItem(key, value);
  };

  localStorage.removeItem = function (key: string): void {
    if (ISOLATED_KEYS.has(key)) {
      try {
        sessionStorage.removeItem(key);
      } catch {}
      try {
        originalRemoveItem(key);
      } catch {}
      return;
    }
    originalRemoveItem(key);
  };
}

// Auto-run immediately when imported on client
if (typeof window !== 'undefined') {
  initSessionIsolation();
}
