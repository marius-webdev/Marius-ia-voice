import { CustomVoiceProfile, SavedCreation, Voice, VoiceAnalysisResult } from '../types.ts';
import { apiKeyManager } from './apiKeyManager.ts';
import { quotaTracker } from './quotaTracker.ts';

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  const key = apiKeyManager.getApiKey();
  if (key) {
    headers['x-gemini-api-key'] = key;
  }
  return headers;
}

export async function checkServerHealth() {
  const res = await fetch('/api/health', {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Serveur injoignable');
  return res.json();
}

export async function verifyApiKey(apiKey: string): Promise<{
  isValid: boolean;
  maskedKey: string;
  accessibleModels?: string[];
  isQuotaExhausted?: boolean;
  errorType?: string;
  message: string;
}> {
  const res = await fetch('/api/auth/verify-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Échec de la validation de la clé API.');
  }
  return data;
}

export async function getApiKeyStatus(): Promise<{
  hasKey: boolean;
  maskedKey: string;
  source: 'user' | 'server' | 'none';
}> {
  const res = await fetch('/api/auth/status', {
    headers: getHeaders(),
  });
  if (!res.ok) return { hasKey: false, maskedKey: '', source: 'none' };
  return res.json();
}

export async function getVoices(): Promise<{ voices: Voice[]; model: string }> {
  const res = await fetch('/api/voices', {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Échec du chargement des voix');
  return res.json();
}

export async function getCustomVoices(): Promise<{ customVoices: CustomVoiceProfile[] }> {
  const res = await fetch('/api/custom-voices', {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Échec du chargement des voix personnalisées');
  return res.json();
}

export async function createCustomVoice(payload: {
  name: string;
  baseVoice: string;
  stylePrompt: string;
  rhythm: string;
  pitch: string;
  description: string;
  consentGiven: boolean;
}): Promise<{ voice: CustomVoiceProfile }> {
  const res = await fetch('/api/custom-voices', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur lors de la création de la voix');
  }
  return res.json();
}

export async function deleteCustomVoice(id: string): Promise<boolean> {
  const res = await fetch(`/api/custom-voices/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur de suppression');
  }
  return true;
}

export async function analyzeVoiceRecording(payload: {
  audioBase64: string;
  mimeType: string;
  durationSeconds: number;
}): Promise<{ success: boolean; analysis: VoiceAnalysisResult }> {
  const res = await fetch('/api/voice/analyze', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const errorMsg = err.error || 'Échec de l\'analyse vocale';
    if (errorMsg.includes('429') || errorMsg.includes('Quota')) {
      quotaTracker.recordQuotaExhausted({
        model: 'gemini-3.1-flash-lite',
        rawError: errorMsg,
      });
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function splitScriptSegments(text: string, maxWords = 80): Promise<{ segments: string[] }> {
  const res = await fetch('/api/tts/split-segments', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ text, maxWords }),
  });
  if (!res.ok) throw new Error('Échec du découpage du texte');
  return res.json();
}

export async function generateSingleSegment(payload: {
  text: string;
  voiceName: string;
  style?: string;
  speed?: number;
  pitch?: string;
}): Promise<{
  audioBase64: string;
  mimeType: string;
  duration: number;
  byteSize: number;
  modelUsed?: string;
  tokensConsumed?: number;
}> {
  const res = await fetch('/api/tts/generate-segment', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const errorMsg = err.error || 'Échec de la génération du segment';

    // Track specific quota/rate limit error in quotaTracker
    if (
      errorMsg.includes('Quota quotidien') ||
      errorMsg.includes('RESOURCE_EXHAUSTED') ||
      errorMsg.includes('10 requêtes par jour')
    ) {
      quotaTracker.recordQuotaExhausted({
        model: 'gemini-3.8-flash-tts',
        rawError: errorMsg,
      });
    } else if (errorMsg.includes('Fréquence de requêtes') || errorMsg.includes('429')) {
      quotaTracker.recordRateLimitSpike({
        model: 'gemini-3.8-flash-tts',
        rawError: errorMsg,
      });
    } else if (errorMsg.includes('503') || errorMsg.includes('Forte affluence')) {
      quotaTracker.recordServerSpike503({
        model: 'gemini-3.8-flash-tts',
        rawError: errorMsg,
      });
    }

    throw new Error(errorMsg);
  }

  const data = await res.json();

  // Track success in quotaTracker
  quotaTracker.recordSuccessfulRequest({
    model: data.modelUsed || 'gemini-3.8-flash-tts',
    characters: payload.text.length,
    tokens: data.tokensConsumed,
  });

  return data;
}

export async function concatenateAudioSegments(payload: {
  segmentBase64s: string[];
  projectName?: string;
  text?: string;
  voiceName?: string;
  customVoiceId?: string | null;
  style?: string;
  speed?: number;
  pitch?: string;
}): Promise<{
  success: boolean;
  creationId: string;
  wavBase64: string;
  duration: number;
  byteSizeWav: number;
}> {
  const res = await fetch('/api/tts/concatenate', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Échec de l\'assemblage des segments');
  }
  return res.json();
}

export async function generateFullTTS(payload: {
  text: string;
  voiceName: string;
  customVoiceId?: string | null;
  style?: string;
  speed?: number;
  pitch?: string;
  projectName?: string;
}) {
  const res = await fetch('/api/tts/generate-full', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Échec de la génération audio');
  }
  return res.json();
}

export async function exportAudio(payload: {
  wavBase64?: string;
  creationId?: string;
  format: 'mp3' | 'wav' | 'ogg';
}): Promise<{
  success: boolean;
  format: 'mp3' | 'wav' | 'ogg';
  mimeType: string;
  audioBase64: string;
  byteSize: number;
}> {
  const res = await fetch('/api/audio/export', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Échec de l'exportation au format ${payload.format.toUpperCase()}`);
  }
  return res.json();
}

export async function getCreations(): Promise<{ creations: SavedCreation[] }> {
  const res = await fetch('/api/creations', {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Échec du chargement des créations');
  return res.json();
}

export async function getCreationDetails(id: string): Promise<{ creation: SavedCreation }> {
  const res = await fetch(`/api/creations/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Création introuvable');
  return res.json();
}

export async function deleteCreation(id: string): Promise<boolean> {
  const res = await fetch(`/api/creations/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Échec de la suppression');
  }
  return true;
}
