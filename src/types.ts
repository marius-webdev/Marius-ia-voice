export interface Voice {
  id: string;
  name: string;
  gender: 'female' | 'male';
  tone: string;
  description: string;
  recommendedFor: string[];
  languages: string[];
  previewPrompt: string;
  isCustom?: boolean;
}

export interface CustomVoiceProfile {
  id: string;
  name: string;
  baseVoice: string;
  stylePrompt: string;
  rhythm: string;
  pitch: string;
  description: string;
  createdAt: string;
  isCustom: true;
  consentGiven: boolean;
}

export interface VoiceAnalysisResult {
  transcript: string;
  wordCount: number;
  wordsPerMinute: number;
  pitchCategory: 'grave' | 'médium' | 'aigu';
  pitchHzEstimate: string;
  tempoStyle: 'rapide' | 'modéré' | 'posé' | 'dynamique';
  vocalTimbre: string;
  pauseAnalysis: string;
  clarityScore: number;
  backgroundNoiseLevel: 'faible' | 'modéré' | 'élevé';
  audioQualityFeedback: string;
  recommendedBaseVoice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  recommendedStylePrompt: string;
  accent: string;
}

export interface VoicePreset {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  stylePrompt: string;
  recommendedVoice: string;
  speed: number;
  pitch: 'deep' | 'normal' | 'high';
}

export interface GenerationSegment {
  index: number;
  text: string;
  audioBase64?: string;
  duration?: number;
  byteSize?: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
}

export interface SavedCreation {
  id: string;
  name: string;
  text: string;
  voiceName: string;
  customVoiceId?: string | null;
  style: string;
  speed: number;
  pitch: string;
  duration: number;
  segmentCount: number;
  createdAt: string;
  audioWavBase64?: string;
  audioMp3Base64?: string;
  fileSizeWav?: number;
  fileSizeMp3?: number;
  hasAudio?: boolean;
}

export interface UserStats {
  totalGenerations: number;
  totalCharacters: number;
  totalSeconds: number;
  customVoicesCount: number;
}
