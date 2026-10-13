import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Activity,
  Zap,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Info,
  CheckCircle2,
  Trash2,
  Sliders,
  Layers,
  Sparkles,
  Key,
} from 'lucide-react';
import { QuotaStatus } from '../types.ts';
import { quotaTracker } from '../services/quotaTracker.ts';
import { apiKeyManager } from '../services/apiKeyManager.ts';

interface QuotaDashboardViewProps {
  onNavigateToApiKey?: () => void;
  onNavigateToTTS?: () => void;
}

export const QuotaDashboardView: React.FC<QuotaDashboardViewProps> = ({
  onNavigateToApiKey,
  onNavigateToTTS,
}) => {
  const [quota, setQuota] = useState<QuotaStatus>(() => quotaTracker.getStatus());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const hasUserKey = apiKeyManager.hasKey();

  const refreshData = () => {
    setIsRefreshing(true);
    const updated = quotaTracker.getStatus();
    setQuota(updated);
    updateCountdown(updated);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const updateCountdown = (status: QuotaStatus) => {
    if (status.retryAvailableAt) {
      const diffMs = new Date(status.retryAvailableAt).getTime() - Date.now();
      const secs = Math.max(0, Math.ceil(diffMs / 1000));
      setCountdownRemaining(secs > 0 ? secs : null);
    } else {
      setCountdownRemaining(null);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const updated = quotaTracker.getStatus();
      setQuota(updated);
      updateCountdown(updated);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClearLocalHistory = () => {
    if (
      confirm(
        'Voulez-vous effacer l\'historique local des requêtes observées ?\n\nNote : Cette action réinitialise uniquement vos compteurs de session locaux. Elle ne modifie pas les quotas réels de Google.'
      )
    ) {
      quotaTracker.clearLocalHistory();
      setQuota(quotaTracker.getStatus());
    }
  };

  // Status checks
  const isDailyQuotaExhausted = quota.rateLimitStatus === 'quota_exhausted';
  const isRateLimited = quota.rateLimitStatus === 'rate_limited';
  const isServerSpike = quota.rateLimitStatus === 'server_spike_503';

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Page Title & Subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <Gauge className="w-4 h-4 text-purple-400" />
            Supervision & Transparence
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Mon utilisation et mes quotas
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Suivi des requêtes observées par l'application, informations vérifiées par Google et documentation officielle.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToTTS && (
            <button
              type="button"
              onClick={onNavigateToTTS}
              className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Aller au Studio TTS
            </button>
          )}

          <button
            type="button"
            onClick={refreshData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* API Key Connection Alert Banner if not configured */}
      {!hasUserKey && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-200">
                Aucune clé API personnelle configurée
              </h3>
              <p className="text-xs text-amber-300/80 mt-0.5 leading-relaxed">
                Marius Voice AI utilise votre propre clé API Google Gemini pour assurer votre autonomie et votre quota dédié.
              </p>
            </div>
          </div>
          {onNavigateToApiKey && (
            <button
              type="button"
              onClick={onNavigateToApiKey}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md"
            >
              Configurer ma clé →
            </button>
          )}
        </div>
      )}

      {/* Category Distinction Notice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-[#101322] border border-purple-500/20 rounded-2xl p-4">
          <div className="font-bold text-purple-300 flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            1. Observé par Marius Voice AI
          </div>
          <p className="text-gray-400 text-[11px] leading-relaxed">
            Statistiques exactes des requêtes et segments audio traités localement durant vos sessions.
          </p>
        </div>

        <div className="bg-[#101322] border border-blue-500/20 rounded-2xl p-4">
          <div className="font-bold text-blue-300 flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            2. Quota Google confirmé
          </div>
          <p className="text-gray-400 text-[11px] leading-relaxed">
            Plafonds et solde exacts indisponibles via l'API standard ; consultables sur votre console Google AI Studio.
          </p>
        </div>

        <div className="bg-[#101322] border border-emerald-500/20 rounded-2xl p-4">
          <div className="font-bold text-emerald-300 flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            3. Estimations & Délais
          </div>
          <p className="text-gray-400 text-[11px] leading-relaxed">
            Temporisation de sécurité (backoff) ou délai Retry-After retourné par Google lors d'un code 429.
          </p>
        </div>
      </div>

      {/* Section 1: Utilisation observée par Marius Voice AI */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          Consommation observée aujourd'hui par Marius Voice AI
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#101322] p-5 rounded-2xl border border-white/5 shadow-xl">
            <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              Requêtes observées
            </div>
            <div className="text-3xl font-extrabold text-white">
              {quota.observedRequestsToday}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Requêtes observées par Marius Voice AI : {quota.observedRequestsToday}
            </p>
          </div>

          <div className="bg-[#101322] p-5 rounded-2xl border border-white/5 shadow-xl">
            <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Segments réussis
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">
              {quota.completedSegmentsToday}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Segments audio assemblés avec succès
            </p>
          </div>

          <div className="bg-[#101322] p-5 rounded-2xl border border-white/5 shadow-xl">
            <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Requêtes échouées
            </div>
            <div className={`text-3xl font-extrabold ${quota.failedRequestsToday > 0 ? 'text-rose-400' : 'text-gray-400'}`}>
              {quota.failedRequestsToday}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Erreurs 429, 503 ou réseau observées
            </p>
          </div>

          <div className="bg-[#101322] p-5 rounded-2xl border border-white/5 shadow-xl">
            <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Caractères transmis
            </div>
            <div className="text-3xl font-extrabold text-white">
              {quota.totalCharactersToday.toLocaleString('fr-FR')}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              ~{quota.tokensConsumedToday.toLocaleString('fr-FR')} tokens estimés
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: État du Quota Google et Disponibilité */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          Statut de disponibilité & Quota Google
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: Current Rate Limit / Quota Status */}
          <div className="bg-[#101322] p-5 rounded-2xl border border-white/5 shadow-xl space-y-3">
            <div className="text-xs text-gray-400 flex items-center justify-between">
              <span className="font-semibold text-gray-300">État actuel de la connexion API</span>
              <span className="text-[10px] text-gray-500 font-mono">
                {new Date(quota.lastUpdated).toLocaleTimeString('fr-FR')}
              </span>
            </div>

            <div>
              {isDailyQuotaExhausted ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                  Quota journalier atteint
                </div>
              ) : isRateLimited ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  Limite temporaire de fréquence (RPM)
                </div>
              ) : isServerSpike ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  Forte affluence temporaire (503)
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  Service opérationnel & Quota disponible
                </div>
              )}
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              {isDailyQuotaExhausted &&
                "Quota journalier atteint. La limite quotidienne de votre projet Google a été atteinte. Réinitialisation selon le cycle de votre projet, sous réserve de disponibilité de l'API."}
              {isRateLimited &&
                (countdownRemaining
                  ? `Limite temporaire atteinte. Nouvelle tentative possible dans environ ${countdownRemaining} secondes.`
                  : 'Limite temporaire atteinte. Veuillez patienter quelques instants avant de relancer une synthèse.')}
              {isServerSpike &&
                'Pic de charge mondial sur l\'infrastructure Google IA. Une temporisation automatique avec réessai est active.'}
              {!isDailyQuotaExhausted && !isRateLimited && !isServerSpike &&
                'Toutes les requêtes audio récentes se sont déroulées sans blocage de quota.'}
            </p>

            {countdownRemaining !== null && countdownRemaining > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Délai Retry-After avant réessai :
                </span>
                <span className="font-mono font-bold text-sm text-amber-300">
                  {countdownRemaining}s
                </span>
              </div>
            )}
          </div>

          {/* Card: Confirmed Capacity & AI Studio Dashboard Link */}
          <div className="bg-[#101322] p-5 rounded-2xl border border-white/5 shadow-xl space-y-3">
            <div className="text-xs text-gray-400 font-semibold text-gray-300">
              Plafond et solde confirmés par Google
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300">
              <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-400" />
                Quota restant exact indisponible auprès de Google
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {quota.googleStatusExplanation}
              </p>
            </div>

            <div className="pt-1">
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-900/30 to-indigo-900/30 hover:from-purple-900/50 hover:to-indigo-900/50 border border-purple-500/30 text-xs text-purple-200 font-semibold transition-all group"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                  Consulter mon tableau de bord Google AI Studio
                </span>
                <span className="text-purple-400">→</span>
              </a>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1">
              <a
                href="https://ai.google.dev/gemini-api/docs/rate-limits"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-purple-300 underline transition-colors"
              >
                Documentation Rate Limits (RPM / RPD)
              </a>
              <span>•</span>
              <a
                href="https://ai.google.dev/gemini-api/docs/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-purple-300 underline transition-colors"
              >
                Tarification Pay-as-you-go
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Journal des requêtes et événements */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Journal des requêtes et événements récents
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Historique local horodaté des appels API émis depuis ce navigateur.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearLocalHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs transition-colors cursor-pointer"
            title="Effacer uniquement les compteurs et journaux locaux"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vider l'historique local</span>
          </button>
        </div>

        {quota.history.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-white/10 rounded-2xl">
            <p className="text-xs text-gray-500">
              Aucune requête audio enregistrée pour le moment aujourd'hui.
            </p>
            {onNavigateToTTS && (
              <button
                type="button"
                onClick={onNavigateToTTS}
                className="mt-3 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold cursor-pointer"
              >
                Créer une synthèse vocale
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {quota.history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {entry.type === 'success' ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  ) : entry.type === 'quota_exhausted_429' ? (
                    <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                  ) : entry.type === 'rate_limit_429' ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                  )}
                  <span className="font-mono text-[11px] text-gray-400 shrink-0">
                    {entry.timestamp}
                  </span>
                  <span className="text-white truncate font-medium">
                    {entry.message}
                  </span>
                </div>
                <div className="shrink-0 text-[11px] font-mono text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/30">
                  {entry.model}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-[11px] text-gray-500 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
          <span>
            ℹ️ Vider l'historique local efface les données de session du navigateur, sans modifier votre quota chez Google.
          </span>
          {onNavigateToApiKey && (
            <button
              onClick={onNavigateToApiKey}
              className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
            >
              Gérer ma clé API Google
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
