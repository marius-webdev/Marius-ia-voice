const LOCAL_KEY_NAME = 'marius_personal_gemini_key';
const SESSION_KEY_NAME = 'marius_session_gemini_key';
const MASKED_META_KEY = 'marius_key_configured_masked';
const STORAGE_MODE_KEY = 'marius_key_storage_mode';

export type KeyStorageMode = 'local' | 'session';

/**
 * Mask an API key securely (e.g. AIzaSy••••••••••••38fL)
 * Never exposes the internal credentials in plain view or logs.
 */
export function maskKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}${'•'.repeat(Math.max(12, key.length - 10))}${suffix}`;
}

/**
 * API Key Manager for Marius Voice AI
 * Supports persistent storage in localStorage (remains across reloads & visits)
 * and optional temporary sessionStorage for shared devices.
 */
export const apiKeyManager = {
  getStorageMode(): KeyStorageMode {
    try {
      const mode = localStorage.getItem(STORAGE_MODE_KEY);
      return mode === 'session' ? 'session' : 'local';
    } catch {
      return 'local';
    }
  },

  getApiKey(): string | null {
    try {
      // Check sessionStorage first (temporary session overrides local)
      const sessionKey = sessionStorage.getItem(SESSION_KEY_NAME);
      if (sessionKey && sessionKey.trim()) {
        return sessionKey.trim();
      }
      // Check persistent localStorage
      const localKey = localStorage.getItem(LOCAL_KEY_NAME);
      if (localKey && localKey.trim()) {
        return localKey.trim();
      }
      return null;
    } catch {
      return null;
    }
  },

  getMaskedKey(): string {
    const key = this.getApiKey();
    if (key) {
      return maskKey(key);
    }
    try {
      return (
        sessionStorage.getItem(MASKED_META_KEY) ||
        localStorage.getItem(MASKED_META_KEY) ||
        ''
      );
    } catch {
      return '';
    }
  },

  hasKey(): boolean {
    return Boolean(this.getApiKey());
  },

  saveApiKey(key: string, mode: KeyStorageMode = 'local') {
    const cleanKey = key.trim();
    if (!cleanKey) return;

    try {
      const masked = maskKey(cleanKey);
      localStorage.setItem(STORAGE_MODE_KEY, mode);
      localStorage.setItem(MASKED_META_KEY, masked);

      if (mode === 'session') {
        sessionStorage.setItem(SESSION_KEY_NAME, cleanKey);
        sessionStorage.setItem(MASKED_META_KEY, masked);
        // Clean from persistent storage
        localStorage.removeItem(LOCAL_KEY_NAME);
      } else {
        // Persistent mode (local)
        localStorage.setItem(LOCAL_KEY_NAME, cleanKey);
        sessionStorage.removeItem(SESSION_KEY_NAME);
      }
    } catch (e) {
      console.warn('Browser storage restriction:', e);
    }
  },

  removeApiKey() {
    try {
      sessionStorage.removeItem(SESSION_KEY_NAME);
      sessionStorage.removeItem(MASKED_META_KEY);
      localStorage.removeItem(LOCAL_KEY_NAME);
      localStorage.removeItem('marius_masked_gemini_key');
      localStorage.removeItem(MASKED_META_KEY);
      localStorage.removeItem(STORAGE_MODE_KEY);
    } catch (e) {
      console.warn('Browser storage clean error:', e);
    }
  },
};
