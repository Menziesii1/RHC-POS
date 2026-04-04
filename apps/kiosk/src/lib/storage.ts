import type { PersistedUiState } from "../types/ui";

const STORAGE_KEY = "rhc-pos-kiosk-state";

export function loadPersistedState(ttlSeconds: number): PersistedUiState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedUiState;
    const ageMs = Date.now() - new Date(parsed.savedAt).getTime();
    if (ageMs > ttlSeconds * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function savePersistedState(state: PersistedUiState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearPersistedState() {
  localStorage.removeItem(STORAGE_KEY);
}
