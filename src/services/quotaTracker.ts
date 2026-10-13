import { QuotaLogEntry, QuotaStatus } from '../types.ts';

const STORAGE_KEY = 'marius_quota_tracker_v2';

// Calculates next midnight Pacific Time (00:00 PT)
export function getNextPacificMidnight(): {
  date: Date;
  beninFormatted: string;
  localFormatted: string;
  timeRemainingFormatted: string;
} {
  const now = new Date();

  // Determine current PT offset (Daylight Saving Time in US: UTC-7, Standard Time: UTC-8)
  // Let's compute precisely using Intl API
  const ptString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const ptDate = new Date(ptString);

  // Target next 00:00 in America/Los_Angeles
  const nextPtMidnight = new Date(ptDate);
  nextPtMidnight.setHours(24, 0, 0, 0);

  const diffMs = nextPtMidnight.getTime() - ptDate.getTime();
  const nextTargetUtc = new Date(now.getTime() + diffMs);

  // Format in Benin timezone (Africa/Porto-Novo, UTC+1)
  const beninFormatted = nextTargetUtc.toLocaleString('fr-FR', {
    timeZone: 'Africa/Porto-Novo',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Format in local browser timezone
  const localFormatted = nextTargetUtc.toLocaleString('fr-FR', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const timeRemainingFormatted = `${diffHours} h ${diffMinutes} min`;

  return {
    date: nextTargetUtc,
    beninFormatted: `demain à ${beninFormatted.split(' à ')[1] || '08 h 00'}, heure du Bénin (UTC+1)`,
    localFormatted,
    timeRemainingFormatted,
  };
}

export function getTodayDateKey(): string {
  // Use PT date as key since Google resets at PT midnight
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

interface StoredQuotaData {
  dateKey: string;
  requestsUsed: number;
  charactersToday: number;
  tokensConsumedToday: number;
  rateLimitStatus: 'normal' | 'rate_limited' | 'quota_exhausted';
  lastRateLimitMessage?: string;
  isVerifiedFromGoogle: boolean;
  lastUpdated: string;
  sourceLabel: string;
  history: QuotaLogEntry[];
}

function loadStoredData(): StoredQuotaData {
  const todayKey = getTodayDateKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: StoredQuotaData = JSON.parse(raw);
      if (parsed.dateKey === todayKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading quota tracker:', e);
  }

  // Fresh quota for new day
  return {
    dateKey: todayKey,
    requestsUsed: 0,
    charactersToday: 0,
    tokensConsumedToday: 0,
    rateLimitStatus: 'normal',
    isVerifiedFromGoogle: false,
    lastUpdated: new Date().toISOString(),
    sourceLabel: 'Estimation calculée par Marius Voice AI',
    history: [],
  };
}

function persistData(data: StoredQuotaData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error persisting quota tracker:', e);
  }
}

export const quotaTracker = {
  getStatus(): QuotaStatus {
    const data = loadStoredData();
    const pacific = getNextPacificMidnight();
    const limit = 10; // Base default limit for gemini-3.8-flash-tts free tier
    const remaining = Math.max(0, limit - data.requestsUsed);

    return {
      dailyRequestsUsed: data.requestsUsed,
      dailyRequestsLimit: limit,
      requestsRemainingEstimated: remaining,
      totalCharactersToday: data.charactersToday,
      tokensConsumedToday: data.tokensConsumedToday,
      rateLimitStatus: data.rateLimitStatus,
      lastRateLimitMessage: data.lastRateLimitMessage,
      resetTimeBenin: pacific.beninFormatted,
      resetTimeLocal: pacific.localFormatted,
      timeUntilReset: pacific.timeRemainingFormatted,
      isVerifiedFromGoogle: data.isVerifiedFromGoogle,
      lastUpdated: data.lastUpdated,
      sourceLabel: data.sourceLabel,
      history: data.history.slice(0, 30),
    };
  },

  recordSuccessfulRequest(params: {
    model: string;
    characters: number;
    tokens?: number;
    sourceMessage?: string;
  }) {
    const data = loadStoredData();
    data.requestsUsed += 1;
    data.charactersToday += params.characters;
    data.tokensConsumedToday += params.tokens || Math.round(params.characters * 0.35);
    data.lastUpdated = new Date().toISOString();
    data.rateLimitStatus = 'normal';
    data.lastRateLimitMessage = undefined;
    data.sourceLabel = 'Compteur de session en direct Marius Voice AI';

    data.history.unshift({
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      model: params.model,
      type: 'success',
      message: params.sourceMessage || `Synthèse réussie (${params.characters} caractères)`,
      characters: params.characters,
      tokensEstimated: params.tokens || Math.round(params.characters * 0.35),
    });

    if (data.history.length > 50) data.history.splice(50);
    persistData(data);
  },

  recordQuotaExhausted(params: {
    model: string;
    rawError: string;
    retryAfter?: string;
  }) {
    const data = loadStoredData();
    data.rateLimitStatus = 'quota_exhausted';
    data.isVerifiedFromGoogle = true;
    data.sourceLabel = 'Information vérifiée par Google Gemini API (Code 429 RESOURCE_EXHAUSTED)';
    data.lastUpdated = new Date().toISOString();
    data.lastRateLimitMessage = params.rawError;

    data.history.unshift({
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      model: params.model,
      type: 'quota_exhausted_429',
      message: `Quota quotidien atteint (Google 429) : ${params.rawError.slice(0, 140)}`,
    });

    if (data.history.length > 50) data.history.splice(50);
    persistData(data);
  },

  recordRateLimitSpike(params: {
    model: string;
    rawError: string;
  }) {
    const data = loadStoredData();
    data.rateLimitStatus = 'rate_limited';
    data.lastUpdated = new Date().toISOString();
    data.lastRateLimitMessage = params.rawError;

    data.history.unshift({
      id: `spike_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      model: params.model,
      type: 'rate_limit_429',
      message: `Ralentissement de fréquence (RPM) : ${params.rawError.slice(0, 140)}`,
    });

    if (data.history.length > 50) data.history.splice(50);
    persistData(data);
  },

  recordServerSpike503(params: {
    model: string;
    rawError: string;
  }) {
    const data = loadStoredData();
    data.lastUpdated = new Date().toISOString();

    data.history.unshift({
      id: `spike503_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      model: params.model,
      type: 'server_spike_503',
      message: `Pic de charge mondial serveur (503 UNAVAILABLE)`,
    });

    if (data.history.length > 50) data.history.splice(50);
    persistData(data);
  },

  resetUsage() {
    const todayKey = getTodayDateKey();
    const fresh: StoredQuotaData = {
      dateKey: todayKey,
      requestsUsed: 0,
      charactersToday: 0,
      tokensConsumedToday: 0,
      rateLimitStatus: 'normal',
      isVerifiedFromGoogle: false,
      lastUpdated: new Date().toISOString(),
      sourceLabel: 'Réinitialisé manuellement',
      history: [],
    };
    persistData(fresh);
  },
};
