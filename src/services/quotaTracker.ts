import { QuotaLogEntry, QuotaStatus } from '../types.ts';

const STORAGE_KEY = 'marius_quota_tracker_v3';

export function getTodayDateKey(): string {
  // Use ISO date format for local day tracking
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

interface StoredQuotaData {
  dateKey: string;
  observedRequests: number;
  successfulRequests: number;
  failedRequests: number;
  completedSegments: number;
  charactersToday: number;
  tokensConsumedToday: number;
  rateLimitStatus: 'normal' | 'rate_limited' | 'quota_exhausted' | 'server_spike_503' | 'unknown';
  lastRateLimitMessage?: string;
  retryAfterSeconds?: number;
  retryAvailableAt?: string;
  resetTargetTimeFormatted?: string;
  resetTargetType: 'confirmed_retry_after' | 'estimated_daily' | 'unknown';
  lastUpdated: string;
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
    // Corrupted storage fallback
  }

  // Clean data for the current calendar day
  return {
    dateKey: todayKey,
    observedRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    completedSegments: 0,
    charactersToday: 0,
    tokensConsumedToday: 0,
    rateLimitStatus: 'normal',
    resetTargetType: 'unknown',
    lastUpdated: new Date().toISOString(),
    history: [],
  };
}

function persistData(data: StoredQuotaData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // Storage quota fallback
  }
}

export const quotaTracker = {
  getStatus(): QuotaStatus {
    const data = loadStoredData();

    // Check if a known retry timeout has expired
    let currentStatus = data.rateLimitStatus;
    if (data.retryAvailableAt) {
      const availableTime = new Date(data.retryAvailableAt).getTime();
      if (Date.now() >= availableTime && currentStatus === 'rate_limited') {
        currentStatus = 'normal';
      }
    }

    return {
      // 1. Observed metrics
      observedRequestsToday: data.observedRequests,
      successfulRequestsToday: data.successfulRequests,
      failedRequestsToday: data.failedRequests,
      completedSegmentsToday: data.completedSegments,
      totalCharactersToday: data.charactersToday,
      tokensConsumedToday: data.tokensConsumedToday,

      // 2. Google confirmed capacity (Honest: Google doesn't return project quota balances via generateContent API)
      googleConfirmedLimit: null,
      googleRemainingCapacity: null,
      googleStatusExplanation:
        "L'API Google Gemini ne fournit aucun point d'accès public permettant d'interroger le solde restant ou les plafonds de facturation de votre projet via la clé API. Consultez votre console Google AI Studio pour les métriques officielles.",

      // 3. Status and limits
      rateLimitStatus: currentStatus,
      lastRateLimitMessage: data.lastRateLimitMessage,
      retryAfterSeconds: data.retryAfterSeconds,
      retryAvailableAt: data.retryAvailableAt,
      resetTargetTimeFormatted: data.resetTargetTimeFormatted,
      resetTargetType: data.resetTargetType,

      lastUpdated: data.lastUpdated,
      sourceLabel: 'Données observées par Marius Voice AI lors de vos sessions',
      history: data.history.slice(0, 30),
    };
  },

  recordInitiatedRequest() {
    const data = loadStoredData();
    data.observedRequests += 1;
    data.lastUpdated = new Date().toISOString();
    persistData(data);
  },

  recordSuccessfulRequest(params: {
    model: string;
    characters: number;
    tokens?: number;
    isSegment?: boolean;
    sourceMessage?: string;
  }) {
    const data = loadStoredData();
    data.successfulRequests += 1;
    if (params.isSegment !== false) {
      data.completedSegments += 1;
    }
    data.charactersToday += params.characters;
    data.tokensConsumedToday += params.tokens || Math.round(params.characters * 0.35);
    data.lastUpdated = new Date().toISOString();
    data.rateLimitStatus = 'normal';
    data.lastRateLimitMessage = undefined;
    data.retryAfterSeconds = undefined;
    data.retryAvailableAt = undefined;

    data.history.unshift({
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      model: params.model,
      type: 'success',
      message: params.sourceMessage || `Segment généré (${params.characters} car.)`,
      characters: params.characters,
      tokensEstimated: params.tokens || Math.round(params.characters * 0.35),
    });

    if (data.history.length > 50) data.history.splice(50);
    persistData(data);
  },

  recordRateLimit(params: {
    model: string;
    rawError: string;
    retryAfterSeconds?: number;
  }) {
    const data = loadStoredData();
    data.failedRequests += 1;
    data.rateLimitStatus = 'rate_limited';
    data.lastRateLimitMessage = params.rawError;
    data.lastUpdated = new Date().toISOString();

    if (params.retryAfterSeconds && params.retryAfterSeconds > 0) {
      data.retryAfterSeconds = params.retryAfterSeconds;
      const targetDate = new Date(Date.now() + params.retryAfterSeconds * 1000);
      data.retryAvailableAt = targetDate.toISOString();
      data.resetTargetTimeFormatted = targetDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      data.resetTargetType = 'confirmed_retry_after';
    } else {
      data.retryAfterSeconds = undefined;
      data.retryAvailableAt = undefined;
      data.resetTargetTimeFormatted = undefined;
      data.resetTargetType = 'unknown';
    }

    data.history.unshift({
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      model: params.model,
      type: 'rate_limit_429',
      message: `Limite de fréquence atteinte (RPM) : ${params.rawError.slice(0, 120)}`,
    });

    if (data.history.length > 50) data.history.splice(50);
    persistData(data);
  },

  recordDailyQuotaExhausted(params: {
    model: string;
    rawError: string;
    retryAfterHours?: number;
  }) {
    const data = loadStoredData();
    data.failedRequests += 1;
    data.rateLimitStatus = 'quota_exhausted';
    data.lastRateLimitMessage = params.rawError;
    data.lastUpdated = new Date().toISOString();

    if (params.retryAfterHours && params.retryAfterHours > 0) {
      const targetDate = new Date(Date.now() + params.retryAfterHours * 3600 * 1000);
      data.resetTargetTimeFormatted = targetDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      data.resetTargetType = 'confirmed_retry_after';
    } else {
      data.resetTargetTimeFormatted = 'Indisponible auprès de Google';
      data.resetTargetType = 'unknown';
    }

    data.history.unshift({
      id: `quota_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      model: params.model,
      type: 'quota_exhausted_429',
      message: `Quota quotidien atteint (RESOURCE_EXHAUSTED) : ${params.rawError.slice(0, 120)}`,
    });

    if (data.history.length > 50) data.history.splice(50);
    persistData(data);
  },

  recordServerSpike503(params: {
    model: string;
    rawError: string;
  }) {
    const data = loadStoredData();
    data.failedRequests += 1;
    data.rateLimitStatus = 'server_spike_503';
    data.lastRateLimitMessage = params.rawError;
    data.lastUpdated = new Date().toISOString();

    data.history.unshift({
      id: `spike503_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      model: params.model,
      type: 'server_spike_503',
      message: 'Forte demande temporaire sur les serveurs Google IA (503)',
    });

    if (data.history.length > 50) data.history.splice(50);
    persistData(data);
  },

  recordGeneralError(params: {
    model: string;
    message: string;
  }) {
    const data = loadStoredData();
    data.failedRequests += 1;
    data.lastUpdated = new Date().toISOString();

    data.history.unshift({
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      model: params.model,
      type: 'error',
      message: params.message.slice(0, 120),
    });

    if (data.history.length > 50) data.history.splice(50);
    persistData(data);
  },

  clearLocalHistory() {
    const todayKey = getTodayDateKey();
    const fresh: StoredQuotaData = {
      dateKey: todayKey,
      observedRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      completedSegments: 0,
      charactersToday: 0,
      tokensConsumedToday: 0,
      rateLimitStatus: 'normal',
      resetTargetType: 'unknown',
      lastUpdated: new Date().toISOString(),
      history: [],
    };
    persistData(fresh);
  },
};
