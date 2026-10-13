import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Copy,
  Info,
  Sparkles,
  Lock,
  Cpu,
  HelpCircle,
  Check,
} from 'lucide-react';
import { apiKeyManager } from '../services/apiKeyManager.ts';
import { verifyApiKey } from '../services/api.ts';

interface ApiKeySettingsViewProps {
  onKeyConfigured?: () => void;
  onNavigateToTTS?: () => void;
  onNavigateToQuotas?: () => void;
}

export const ApiKeySettingsView: React.FC<ApiKeySettingsViewProps> = ({
  onKeyConfigured,
  onNavigateToTTS,
  onNavigateToQuotas,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Status state
  const [isSaved, setIsSaved] = useState(() => apiKeyManager.hasKey());
  const [maskedKey, setMaskedKey] = useState(() => apiKeyManager.getMaskedKey());
  const [isEditingNewKey, setIsEditingNewKey] = useState(!apiKeyManager.hasKey());

  // Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    accessibleModels?: string[];
    isQuotaExhausted?: boolean;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setIsSaved(apiKeyManager.hasKey());
    setMaskedKey(apiKeyManager.getMaskedKey());
  }, []);

  const handleTestKey = async () => {
    const keyToTest = isEditingNewKey ? apiKeyInput.trim() : apiKeyManager.getApiKey();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'Veuillez renseigner une clé API à tester.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await verifyApiKey(keyToTest);
      setTestResult({
        success: res.isValid,
        message: res.message,
        accessibleModels: res.accessibleModels,
        isQuotaExhausted: res.isQuotaExhausted,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Échec de la vérification de la clé API auprès de Google.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveKey = () => {
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      setTestResult({
        success: false,
        message: 'La clé API ne peut pas être vide.',
      });
      return;
    }

    apiKeyManager.saveApiKey(cleanKey);
    setIsSaved(true);
    setMaskedKey(apiKeyManager.getMaskedKey());
    setApiKeyInput('');
    setIsEditingNewKey(false);
    setTestResult({
      success: true,
      message: 'Votre clé API a été enregistrée avec succès en session sécurisée.',
    });
    if (onKeyConfigured) onKeyConfigured();
  };

  const handleReplaceKey = () => {
    setIsEditingNewKey(true);
    setApiKeyInput('');
    setTestResult(null);
  };

  const handleDeleteKey = () => {
    apiKeyManager.removeApiKey();
    setIsSaved(false);
    setMaskedKey('');
    setApiKeyInput('');
    setIsEditingNewKey(true);
    setTestResult({
      success: false,
      message: 'Clé API supprimée du studio. Aucune clé n\'est actuellement active.',
    });
  };

  const copyStudioUrl = () => {
    navigator.clipboard.writeText('https://aistudio.google.com/apikey');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Title Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
          <Key className="w-4 h-4 text-purple-400" />
          Sécurité & Clé Personnelle
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Ma clé API Google
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Configurez votre clé personnelle Google AI Studio. Marius Voice AI utilise exclusivement votre clé configurée, sans clé partagée ni fallback développeur.
        </p>
      </div>

      {/* Main Card: Configure / Manage Key */}
      <div className="bg-[#101322] rounded-3xl border border-purple-500/20 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                isSaved
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-950/60 border border-amber-500/40 text-amber-400'
              }`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Statut de la clé API</h2>
                {isSaved ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Connectée & Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Non configurée
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {isSaved
                  ? 'Votre studio Marius Voice AI utilise votre clé personnelle pour toutes les synthèses vocales.'
                  : 'Veuillez renseigner votre clé personnelle Google Gemini ci-dessous.'}
              </p>
            </div>
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all shadow-sm"
          >
            <span>Obtenir une clé sur AI Studio</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Existing Saved Key State */}
        {isSaved && !isEditingNewKey ? (
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-2xl bg-[#090b14] border border-white/5 space-y-2">
              <span className="text-xs text-gray-400 block font-medium">
                Clé API active (masquée pour votre sécurité)
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm sm:text-base text-purple-200 tracking-wider">
                  {maskedKey || 'AIzaSy••••••••••••••••••••••••'}
                </span>
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Session active
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTesting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Tester ma clé</span>
              </button>

              <button
                type="button"
                onClick={handleReplaceKey}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <span>Remplacer ma clé</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteKey}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-red-300 text-xs font-semibold transition-all cursor-pointer ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer ma clé</span>
              </button>
            </div>
          </div>
        ) : (
          /* Input Field for entering or replacing key */
          <div className="py-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Entrez votre clé API Google Gemini (commence par AIzaSy...)
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  autoComplete="off"
                  spellCheck="false"
                  className="w-full bg-[#090b14] border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-gray-600 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                  title={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-purple-400" />
                Stockage sécurisé en session navigateur (sessionStorage). La clé n'est jamais enregistrée en texte clair de manière permanente ni partagée.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTesting || !apiKeyInput.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Tester ma clé</span>
              </button>

              <button
                type="button"
                onClick={handleSaveKey}
                disabled={!apiKeyInput.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-900/40 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Enregistrer ma clé</span>
              </button>

              {isSaved && (
                <button
                  type="button"
                  onClick={() => setIsEditingNewKey(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        )}

        {/* Verification / Test Result Feedback Banner */}
        {testResult && (
          <div
            className={`mt-4 p-4 rounded-2xl border text-xs space-y-2 ${
              testResult.success
                ? testResult.isQuotaExhausted
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/40 border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {testResult.success ? (
                testResult.isQuotaExhausted ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                )
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold text-sm">{testResult.message}</p>
                {testResult.accessibleModels && testResult.accessibleModels.length > 0 && (
                  <div className="pt-2">
                    <span className="font-semibold text-[11px] block mb-1">
                      Modèles testés :
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] font-mono opacity-90">
                      {testResult.accessibleModels.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {testResult.success && onNavigateToTTS && (
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onNavigateToTTS}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Commencer une synthèse vocale →
                </button>
                {onNavigateToQuotas && (
                  <button
                    type="button"
                    onClick={onNavigateToQuotas}
                    className="text-purple-300 hover:text-purple-200 underline text-xs cursor-pointer"
                  >
                    Voir mon tableau de bord quotas
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guide: How to obtain a Google Gemini API Key */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Guide pas-à-pas : Obtenir votre clé API Google Gemini
            </h2>
            <p className="text-xs text-gray-400">
              Gratuit, sans carte bancaire obligatoire pour débuter, en moins de 2 minutes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#090b14] border border-white/5 space-y-2">
            <span className="w-6 h-6 rounded-lg bg-purple-600/30 text-purple-300 font-bold text-xs flex items-center justify-center">
              1
            </span>
            <h3 className="text-xs font-bold text-white">Accédez à Google AI Studio</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Ouvrez la console officielle des développeurs Google AI Studio avec votre compte Google standard.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={copyStudioUrl}
                className="flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300 font-mono cursor-pointer"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Lien copié !' : 'Copier l\'adresse'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#090b14] border border-white/5 space-y-2">
            <span className="w-6 h-6 rounded-lg bg-purple-600/30 text-purple-300 font-bold text-xs flex items-center justify-center">
              2
            </span>
            <h3 className="text-xs font-bold text-white">Générez votre clé API</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Cliquez sur le bouton bleu « <strong>Create API Key</strong> » (Créer une clé API). Choisissez un projet Google Cloud ou laissez Google en créer un automatiquement.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#090b14] border border-white/5 space-y-2">
            <span className="w-6 h-6 rounded-lg bg-purple-600/30 text-purple-300 font-bold text-xs flex items-center justify-center">
              3
            </span>
            <h3 className="text-xs font-bold text-white">Collez la clé ici</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Copiez la chaîne de caractères (qui commence par <code>AIzaSy...</code>) et collez-la dans le champ ci-dessus, puis cliquez sur « Enregistrer ma clé ».
            </p>
          </div>
        </div>

        {/* Important clarifications */}
        <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200 space-y-2">
          <div className="font-bold flex items-center gap-2 text-purple-300">
            <Info className="w-4 h-4 text-purple-400 shrink-0" />
            Règles de quotas Google importantes :
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-300">
            <li>
              <strong>Quotas par projet :</strong> Si vous créez plusieurs clés API au sein du même projet Google Cloud, elles partagent toutes le même pool de quota. Créer plusieurs clés ne multiplie pas le quota gratuit.
            </li>
            <li>
              <strong>Plafonds gratuits :</strong> L'accès gratuit de Google AI Studio est soumis à des limites de fréquence (RPM) et à des quotas quotidiens (RPD).
            </li>
            <li>
              <strong>Passage au Pay-as-you-go :</strong> Pour les scripts volumineux sans restrictions de requêtes par minute, vous pouvez lier un compte de facturation Google Cloud à votre projet sur AI Studio.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
