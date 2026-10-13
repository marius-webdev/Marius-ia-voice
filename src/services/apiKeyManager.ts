const SESSION_KEY_NAME = 'marius_session_gemini_key';
const MASKED_META_KEY = 'marius_key_configured_masked';

/**
 * Mask an API key securely (e.g. AIzaSy••••••••••••38fL)
 * Never exposes the internal credentials in plain view.
 */
export function maskKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}${'•'.repeat(Math.max(12, key.length - 10))}${suffix}`;
}

/**
 * API Key Manager for Marius Voice AI
 * Strictly stores personal API key in sessionStorage (session-only).
 * Does NOT persist raw API keys in localStorage.
 */
export const apiKeyManager = {
  getApiKey(): string | null {
    try {
      return sessionStorage.getItem(SESSION_KEY_NAME) || null;
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

  saveApiKey(key: string) {
    const cleanKey = key.trim();
    if (!cleanKey) return;

    try {
      // Store raw key in sessionStorage ONLY
      sessionStorage.setItem(SESSION_KEY_NAME, cleanKey);
      const masked = maskKey(cleanKey);
      sessionStorage.setItem(MASKED_META_KEY, masked);

      // Clean up any old plaintext keys from localStorage
      localStorage.removeItem('marius_personal_gemini_key');
      localStorage.setItem(MASKED_META_KEY, masked);
    } catch (e) {
      // storage restriction fallback
    }
  },

  removeApiKey() {
    try {
      sessionStorage.removeItem(SESSION_KEY_NAME);
      sessionStorage.removeItem(MASKED_META_KEY);
      localStorage.removeItem('marius_personal_gemini_key');
      localStorage.removeItem('marius_masked_gemini_key');
      localStorage.removeItem(MASKED_META_KEY);
    } catch (e) {
      // storage restriction fallback
    }
  },
};
