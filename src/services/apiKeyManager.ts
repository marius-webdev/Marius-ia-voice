const KEY_STORAGE_NAME = 'marius_personal_gemini_key';
const MASKED_STORAGE_NAME = 'marius_masked_gemini_key';

export function maskKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}${'•'.repeat(Math.max(12, key.length - 10))}${suffix}`;
}

export const apiKeyManager = {
  getApiKey(): string | null {
    try {
      return (
        sessionStorage.getItem(KEY_STORAGE_NAME) ||
        localStorage.getItem(KEY_STORAGE_NAME) ||
        null
      );
    } catch {
      return null;
    }
  },

  getMaskedKey(): string {
    const key = this.getApiKey();
    if (!key) {
      try {
        return localStorage.getItem(MASKED_STORAGE_NAME) || '';
      } catch {
        return '';
      }
    }
    return maskKey(key);
  },

  hasKey(): boolean {
    return Boolean(this.getApiKey());
  },

  saveApiKey(key: string, persist = true) {
    const cleanKey = key.trim();
    if (!cleanKey) return;

    try {
      sessionStorage.setItem(KEY_STORAGE_NAME, cleanKey);
      if (persist) {
        localStorage.setItem(KEY_STORAGE_NAME, cleanKey);
      } else {
        localStorage.removeItem(KEY_STORAGE_NAME);
      }
      localStorage.setItem(MASKED_STORAGE_NAME, maskKey(cleanKey));
    } catch (e) {
      console.error('Error saving API key:', e);
    }
  },

  removeApiKey() {
    try {
      sessionStorage.removeItem(KEY_STORAGE_NAME);
      localStorage.removeItem(KEY_STORAGE_NAME);
      localStorage.removeItem(MASKED_STORAGE_NAME);
    } catch (e) {
      console.error('Error removing API key:', e);
    }
  },
};
