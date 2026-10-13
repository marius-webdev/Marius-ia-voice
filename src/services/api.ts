import { CustomVoiceProfile, SavedCreation, Voice, VoiceAnalysisResult } from '../types.ts';

export async function checkServerHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Serveur injoignable');
  return res.json();
}

export async function getVoices(): Promise<{ voices: Voice[]; model: string }> {
  const res = await fetch('/api/voices');
  if (!res.ok) throw new Error('Échec du chargement des voix');
  return res.json();
}

export async function getCustomVoices(): Promise<{ customVoices: CustomVoiceProfile[] }> {
  const res = await fetch('/api/custom-voices');
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur lors de la création de la voix');
  }
  return res.json();
}

export async function deleteCustomVoice(id: string): Promise<boolean> {
  const res = await fetch(`/api/custom-voices/${id}`, { method: 'DELETE' });
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Échec de l\'analyse vocale');
  }
  return res.json();
}

export async function splitScriptSegments(text: string, maxWords = 80): Promise<{ segments: string[] }> {
  const res = await fetch('/api/tts/split-segments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
}): Promise<{ audioBase64: string; mimeType: string; duration: number; byteSize: number }> {
  const res = await fetch('/api/tts/generate-segment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Échec de la génération du segment');
  }
  return res.json();
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Échec de l'exportation au format ${payload.format.toUpperCase()}`);
  }
  return res.json();
}

export async function getCreations(): Promise<{ creations: SavedCreation[] }> {
  const res = await fetch('/api/creations');
  if (!res.ok) throw new Error('Échec du chargement des créations');
  return res.json();
}

export async function getCreationDetails(id: string): Promise<{ creation: SavedCreation }> {
  const res = await fetch(`/api/creations/${id}`);
  if (!res.ok) throw new Error('Création introuvable');
  return res.json();
}

export async function deleteCreation(id: string): Promise<boolean> {
  const res = await fetch(`/api/creations/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Échec de la suppression');
  }
  return true;
}
