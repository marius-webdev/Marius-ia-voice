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
  const [isPersistLocally, setIsPersistLocally] = useState(true);

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

    apiKeyManager.saveApiKey(cleanKey, isPersistLocally);
    setIsSaved(true);
    setMaskedKey(apiKeyManager.getMaskedKey());
    setApiKeyInput('');
    setIsEditingNewKey(false);
    setTestResult({
      success: true,
      message: 'Votre clé API a été enregistrée avec succès pour cette session.',
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
          Sécurité & Authentification Personnelle
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Ma clé API Google
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Configurez votre propre clé Google AI Studio pour générer vos voix en direct, éliminer les restrictions de partage et suivre précisément votre consommation.
        </p>
      </div>

      {/* Main Card: Configure / Manage Key */}
      <div className="bg-[#101322] rounded-3xl border border-purple-500/20 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              isSaved
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                : 'bg-amber-950/60 border border-amber-500/40 text-amber-400'
            }`}>
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
                  ? 'Votre studio Marius Voice AI utilise votre clé privée pour toutes les synthèses vocales.'
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
              <span className="text-xs text-gray-400 block font-medium">Clé API enregistrée (masquée pour votre sécurité)</span>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm sm:text-base text-purple-200 tracking-wider">
                  {maskedKey || 'AIzaSy••••••••••••••••••••••••'}
                </span>
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Sécurisé
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
                Entrez votre clé API Google Gemini (commence généralement par AIzaSy...)
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
                La clé reste stockée localement dans votre navigateur et n'est jamais exposée ni partagée publiquement.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="persistLocal"
                checked={isPersistLocally}
                onChange={(e) => setIsPersistLocally(e.target.checked)}
                className="rounded border-white/10 bg-[#090b14] text-purple-600 focus:ring-purple-500 w-4 h-4"
              />
              <label htmlFor="persistLocal" className="text-xs text-gray-300 cursor-pointer">
                Mémoriser ma clé sur cet appareil (recommandé pour ne pas avoir à la ressaisir)
              </label>
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
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-all ml-auto cursor-pointer"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        )}

        {/* Verification / Test Feedback Banner */}
        {testResult && (
          <div className={`mt-4 p-4 rounded-2xl border transition-all ${
            testResult.success
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-red-950/30 border-red-500/30 text-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-2 flex-1">
                <div className="text-xs font-bold">
                  {testResult.success ? 'Vérification réussie' : 'Échec de vérification'}
                </div>
                <p className="text-xs leading-relaxed opacity-90">{testResult.message}</p>

                {testResult.accessibleModels && testResult.accessibleModels.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-gray-300 block mb-1">
                      Modèles validés et disponibles pour ce projet :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {testResult.accessibleModels.map((m, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-purple-200"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {testResult.success && onNavigateToTTS && (
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onNavigateToTTS}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Aller à la Synthèse Vocale →
                    </button>
                    {onNavigateToQuotas && (
                      <button
                        type="button"
                        onClick={onNavigateToQuotas}
                        className="text-xs text-purple-300 underline hover:text-white"
                      >
                        Consulter mes quotas
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION: French API Key Setup Tutorial */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Guide pas-à-pas : Obtenir votre clé Google AI Studio
            </h2>
            <p className="text-xs text-gray-400">
              Procédure gratuite et rapide en 8 étapes pour configurer votre accès.
            </p>
          </div>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            {
              step: '1',
              title: 'Ouvrir Google AI Studio',
              desc: 'Accédez à la plateforme officielle des développeurs Google pour les modèles Gemini.',
            },
            {
              step: '2',
              title: 'Connexion Google',
              desc: 'Connectez-vous avec votre compte Google personnel ou professionnel habituel.',
            },
            {
              step: '3',
              title: 'Accéder aux clés d\'API',
              desc: 'Ouvrez directement la page dédiée : https://aistudio.google.com/apikey',
              hasLink: true,
            },
            {
              step: '4',
              title: 'Créer une clé API',
              desc: 'Cliquez sur "Create API key" et sélectionnez votre projet Google Cloud (ou créez-en un nouveau en 1 clic).',
            },
            {
              step: '5',
              title: 'Copier la clé générée',
              desc: 'Copiez la clé confidentielle (celle-ci commence généralement par AIzaSy...).',
            },
            {
              step: '6',
              title: 'Revenir sur Marius Voice AI',
              desc: 'Retournez sur cet onglet de configuration dans votre studio.',
            },
            {
              step: '7',
              title: 'Coller dans le champ',
              desc: 'Collez la clé dans le champ ci-dessus "Entrez votre clé API Google Gemini".',
            },
            {
              step: '8',
              title: 'Tester puis enregistrer',
              desc: 'Cliquez sur "Tester ma clé". Une fois le test réussi, cliquez sur "Enregistrer ma clé".',
            },
          ].map((item) => (
            <li
              key={item.step}
              className="bg-[#090b14] p-3.5 rounded-2xl border border-white/5 flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-lg bg-purple-600/20 text-purple-300 font-bold flex items-center justify-center shrink-0 text-xs">
                {item.step}
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-white">{item.title}</div>
                <div className="text-gray-400 text-[11px] leading-relaxed">{item.desc}</div>
                {item.hasLink && (
                  <button
                    type="button"
                    onClick={copyStudioUrl}
                    className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 underline pt-1 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Lien copié !' : 'Copier l\'adresse AI Studio'}</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* SECTION: Official Documentation Links */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-purple-400" />
          Documentations officielles Google Gemini
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <a
            href="https://ai.google.dev/gemini-api/docs/rate-limits"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-[#090b14] border border-white/5 hover:border-purple-500/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <span className="font-bold text-white group-hover:text-purple-300 transition-colors">
                Limites de Fréquence
              </span>
              <p className="text-[11px] text-gray-400 mt-1">
                Quotas RPM (requêtes/min) et RPD (requêtes/jour) par modèle.
              </p>
            </div>
            <span className="text-[10px] text-purple-400 mt-3 inline-flex items-center gap-1">
              Consulter <ExternalLink className="w-2.5 h-2.5" />
            </span>
          </a>

          <a
            href="https://ai.google.dev/gemini-api/docs/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-[#090b14] border border-white/5 hover:border-purple-500/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <span className="font-bold text-white group-hover:text-purple-300 transition-colors">
                Grille Tarifaire
              </span>
              <p className="text-[11px] text-gray-400 mt-1">
                Détails du palier gratuit et coût par million de jetons audio.
              </p>
            </div>
            <span className="text-[10px] text-purple-400 mt-3 inline-flex items-center gap-1">
              Consulter <ExternalLink className="w-2.5 h-2.5" />
            </span>
          </a>

          <a
            href="https://ai.google.dev/gemini-api/docs/speech-generation"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-[#090b14] border border-white/5 hover:border-purple-500/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <span className="font-bold text-white group-hover:text-purple-300 transition-colors">
                Synthèse Vocale (TTS)
              </span>
              <p className="text-[11px] text-gray-400 mt-1">
                Spécifications audio 24kHz et tags vocaux pris en charge.
              </p>
            </div>
            <span className="text-[10px] text-purple-400 mt-3 inline-flex items-center gap-1">
              Consulter <ExternalLink className="w-2.5 h-2.5" />
            </span>
          </a>
        </div>
      </div>

      {/* MANDATORY OFFICIAL FRENCH NOTICE */}
      <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-5 text-xs text-purple-200/90 leading-relaxed shadow-lg">
        <div className="flex items-center gap-2 font-bold text-purple-300 mb-1.5">
          <Info className="w-4 h-4 text-purple-400 shrink-0" />
          Notice Légale et Conditions d'Accès aux Services Google
        </div>
        <p className="italic">
          « Google peut proposer un accès gratuit dans certaines limites. Les quotas dépendent du projet, du modèle, du niveau d'accès et des conditions de Google. Certaines fonctionnalités peuvent nécessiter une facturation. Marius Voice AI ne garantit pas un accès illimité ni la gratuité permanente. »
        </p>
      </div>
    </div>
  );
};
