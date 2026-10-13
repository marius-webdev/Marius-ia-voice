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
  retries?: number;
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

export interface ApiKeyConfig {
  hasKey: boolean;
  maskedKey: string;
  savedLocally: boolean;
  isValidated: boolean;
  lastTestedAt?: string;
  testStatus?: 'idle' | 'testing' | 'success' | 'error';
  testMessage?: string;
  accessibleModels?: string[];
  isQuotaExhausted?: boolean;
}

export interface QuotaLogEntry {
  id: string;
  timestamp: string;
  model: string;
  type: 'success' | 'rate_limit_429' | 'quota_exhausted_429' | 'server_spike_503' | 'error';
  message: string;
  characters?: number;
  tokensEstimated?: number;
}

export interface QuotaStatus {
  dailyRequestsUsed: number;
  dailyRequestsLimit: number;
  requestsRemainingEstimated: number;
  totalCharactersToday: number;
  tokensConsumedToday: number;
  rateLimitStatus: 'normal' | 'rate_limited' | 'quota_exhausted';
  lastRateLimitMessage?: string;
  resetTimeBenin: string;
  resetTimeLocal: string;
  timeUntilReset: string;
  isVerifiedFromGoogle: boolean;
  lastUpdated: string;
  sourceLabel: string;
  history: QuotaLogEntry[];
}
