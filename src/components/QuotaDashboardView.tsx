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
  Calendar,
  CheckCircle2,
  Trash2,
  Sliders,
  Layers,
  Sparkles,
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
  const hasUserKey = apiKeyManager.hasKey();

  const refreshData = () => {
    setIsRefreshing(true);
    setQuota(quotaTracker.getStatus());
    setTimeout(() => setIsRefreshing(false), 400);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setQuota(quotaTracker.getStatus());
    }, 15000); // Live countdown update every 15s
    return () => clearInterval(timer);
  }, []);

  const handleResetLocalTracker = () => {
    if (confirm('Voulez-vous réinitialiser le compteur local de consommation ?')) {
      quotaTracker.resetUsage();
      setQuota(quotaTracker.getStatus());
    }
  };

  // Status badge styling
  const isExhausted = quota.rateLimitStatus === 'quota_exhausted';
  const isLimited = quota.rateLimitStatus === 'rate_limited';

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Page Title & Subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
            <Gauge className="w-4 h-4 text-purple-400" />
            Transparence & Consommation Réelle
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Mon utilisation et mes quotas
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Visualisez précisément vos requêtes consommées, vos limites de palier et le temps restant avant la réinitialisation journalière.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
                Pour suivre vos propres quotas Google AI Studio de manière dédiée et éviter tout blocage, activez votre clé dans les réglages.
              </p>
            </div>
          </div>
          {onNavigateToApiKey && (
            <button
              type="button"
              onClick={onNavigateToApiKey}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md"
            >
              Configurer ma clé →
            </button>
          )}
        </div>
      )}

      {/* Source Distinction Banner (Mandatory Requirement) */}
      <div className="bg-[#101322] rounded-2xl border border-white/5 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-300">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="font-semibold text-white">Source des indicateurs affichés :</span>
          <span className="text-purple-300 font-mono bg-purple-950/50 px-2 py-0.5 rounded-md border border-purple-800/40">
            {quota.sourceLabel}
          </span>
        </div>
        <div className="text-[11px] text-gray-400">
          Dernière mise à jour : {new Date(quota.lastUpdated).toLocaleTimeString('fr-FR')}
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Requests Used / Limit */}
        <div className="bg-[#101322] p-5 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
          <div className="text-xs text-gray-400 flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-400" />
              Requêtes Utilisées
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
              Aujourd'hui
            </span>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {quota.dailyRequestsUsed} <span className="text-lg font-normal text-gray-500">/ {quota.dailyRequestsLimit}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            « Requêtes utilisées : {quota.dailyRequestsUsed} / {quota.dailyRequestsLimit} »
          </p>
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isExhausted ? 'bg-red-500' : isLimited ? 'bg-amber-500' : 'bg-purple-500'
              }`}
              style={{
                width: `${Math.min(100, (quota.dailyRequestsUsed / quota.dailyRequestsLimit) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Card 2: Requests Remaining */}
        <div className="bg-[#101322] p-5 rounded-3xl border border-white/5 shadow-xl">
          <div className="text-xs text-gray-400 flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              Requêtes Restantes
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
              Estimé
            </span>
          </div>
          <div className={`text-3xl font-extrabold tracking-tight ${
            quota.requestsRemainingEstimated === 0 ? 'text-red-400' : 'text-emerald-400'
          }`}>
            {quota.requestsRemainingEstimated}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            « Requêtes restantes estimées : {quota.requestsRemainingEstimated} »
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            Basé sur le palier gratuit Gemini TTS
          </p>
        </div>

        {/* Card 3: Rate Limit & Daily Status */}
        <div className="bg-[#101322] p-5 rounded-3xl border border-white/5 shadow-xl">
          <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Statut du Quota
          </div>
          <div className="pt-1">
            {isExhausted ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-300">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                Quota Quotidien Atteint
              </div>
            ) : isLimited ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Fréquence Élevée (RPM)
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Quota Normal & Disponible
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            {isExhausted
              ? 'Le palier gratuit est temporairement saturé.'
              : 'Capacité disponible pour nouvelles synthèses.'}
          </p>
        </div>

        {/* Card 4: Daily Reset Time (Benin & Local Time) */}
        <div className="bg-[#101322] p-5 rounded-3xl border border-white/5 shadow-xl">
          <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Prochaine Réinitialisation
          </div>
          <div className="text-sm font-bold text-purple-200">
            {quota.resetTimeBenin}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Votre heure locale : <span className="text-white font-medium">{quota.resetTimeLocal}</span>
          </p>
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-900/40">
            <Clock className="w-3 h-3" />
            Dans {quota.timeUntilReset}
          </div>
        </div>
      </div>

      {/* Model-by-Model Quota Breakdown Table */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            Plafonds et Quotas Officiels par Modèle Google AI Studio
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Les règles appliquées par Google selon les modèles vocaux et textuels de Marius Voice AI.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Modèle IA</th>
                <th className="py-3 px-3">Rôle dans Marius Voice AI</th>
                <th className="py-3 px-3">Limite Quotidienne (RPD)</th>
                <th className="py-3 px-3">Limite Minute (RPM)</th>
                <th className="py-3 px-3">Option Pay-As-You-Go</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3 px-3 font-mono font-semibold text-purple-300">gemini-3.8-flash-tts</td>
                <td className="py-3 px-3">Synthèse Vocale Studio 24kHz (Voix HD)</td>
                <td className="py-3 px-3">
                  <span className="font-bold text-white">10 requêtes / jour</span> (Gratuit)
                </td>
                <td className="py-3 px-3 font-mono">3 RPM</td>
                <td className="py-3 px-3 text-emerald-400">Illimité selon facturation Google</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3 px-3 font-mono font-semibold text-indigo-300">gemini-3.8-flash-lite-tts</td>
                <td className="py-3 px-3">Secours Haute Cadence (Failover)</td>
                <td className="py-3 px-3">
                  <span className="font-bold text-white">50 requêtes / jour</span> (Gratuit)
                </td>
                <td className="py-3 px-3 font-mono">10 RPM</td>
                <td className="py-3 px-3 text-emerald-400">Haute disponibilité</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3 px-3 font-mono font-semibold text-cyan-300">gemini-3.1-flash-lite</td>
                <td className="py-3 px-3">Analyse & Calibrage Vocal « Ma Voix »</td>
                <td className="py-3 px-3">
                  <span className="font-bold text-white">1 500 requêtes / jour</span> (Gratuit)
                </td>
                <td className="py-3 px-3 font-mono">15 RPM</td>
                <td className="py-3 px-3 text-emerald-400">Non plafonné</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Explain Long Audio Scripts vs Quota */}
        <div className="bg-[#090b14] p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Info className="w-4 h-4 text-purple-400" />
            Comment gérer un texte long (ex: 24 segments de 3 à 5 minutes) ?
          </span>
          <p className="text-gray-300 leading-relaxed text-[11px]">
            Pour garantir une prosodie sans faille, Marius Voice AI découpe les longs discours en segments audio consécutifs.
            Chaque segment consomme 1 requête TTS. Si votre compte est sur le palier gratuit (10 requêtes / jour), un script de 24 segments atteindra la limite au 10ème segment.
          </p>
          <div className="pt-1 flex flex-wrap gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-lg bg-purple-950/50 border border-purple-800/40 text-purple-300">
              ✓ Les 10 premiers segments restent sauvegardés et intacts
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-950/50 border border-indigo-800/40 text-indigo-300">
              ✓ Vous pouvez reprendre la génération dès la réinitialisation journalière
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-300">
              ✓ Ou activer la facturation Google Cloud pour terminer l'intégralité du script en continu
            </span>
          </div>
        </div>
      </div>

      {/* Activity History Log */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Journal d'Activité Récent & Événements Quota
            </h3>
            <p className="text-[11px] text-gray-400">
              Historique des requêtes émises et des retours d'API depuis votre navigateur.
            </p>
          </div>
          {quota.history.length > 0 && (
            <button
              type="button"
              onClick={handleResetLocalTracker}
              className="text-[11px] text-gray-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Effacer le journal
            </button>
          )}
        </div>

        {quota.history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs bg-[#090b14] rounded-2xl border border-white/5">
            Aucune requête audio enregistrée pour cette journée. Lancez une synthèse pour suivre l'activité.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {quota.history.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-xl bg-[#090b14] border border-white/5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  {entry.type === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  {entry.type === 'quota_exhausted_429' && (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  {entry.type === 'rate_limit_429' && (
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  {entry.type === 'server_spike_503' && (
                    <RefreshCw className="w-4 h-4 text-purple-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-medium text-white">{entry.message}</span>
                    <div className="text-[10px] text-gray-500 font-mono">
                      Modèle : {entry.model} {entry.tokensEstimated ? `• ~${entry.tokensEstimated} tokens` : ''}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 font-mono shrink-0">
                  {entry.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mandatory Disclaimer Box */}
      <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-5 text-xs text-purple-200/90 leading-relaxed shadow-lg">
        <div className="flex items-center gap-2 font-bold text-purple-300 mb-1.5">
          <Info className="w-4 h-4 text-purple-400 shrink-0" />
          Rappel de l'accès aux quotas Google AI Studio
        </div>
        <p className="italic">
          « Google peut proposer un accès gratuit dans certaines limites. Les quotas dépendent du projet, du modèle, du niveau d'accès et des conditions de Google. Certaines fonctionnalités peuvent nécessiter une facturation. Marius Voice AI ne garantit pas un accès illimité ni la gratuité permanente. »
        </p>
      </div>
    </div>
  );
};
