import React from 'react';
import {
  Sliders,
  ShieldCheck,
  Zap,
  Activity,
  Cpu,
  FileAudio,
  Trash2,
  ExternalLink,
  CheckCircle2,
  HardDrive,
  Info,
  Smartphone,
} from 'lucide-react';
import { UserStats } from '../types.ts';

interface UsageStatsViewProps {
  stats: UserStats;
  onClearAllData: () => void;
  onOpenMobileInstall?: () => void;
}

export const UsageStatsView: React.FC<UsageStatsViewProps> = ({ stats, onClearAllData, onOpenMobileInstall }) => {
  const formatMinutes = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} sec`;
    return `${mins} min ${secs} s`;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
          <Sliders className="w-7 h-7 text-purple-400" />
          Paramètres & Utilisation du Studio
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Suivez votre consommation, les spécifications techniques du moteur audio et la politique de confidentialité.
        </p>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#101322] p-5 rounded-2xl border border-white/5 shadow-xl">
          <div className="text-xs text-gray-400 flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Générations Réalisées
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {stats.totalGenerations}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Projets synthétisés</p>
        </div>

        <div className="bg-[#101322] p-5 rounded-2xl border border-white/5 shadow-xl">
          <div className="text-xs text-gray-400 flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Caractères Traités
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {stats.totalCharacters.toLocaleString('fr-FR')}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Textes convertis</p>
        </div>

        <div className="bg-[#101322] p-5 rounded-2xl border border-white/5 shadow-xl">
          <div className="text-xs text-gray-400 flex items-center gap-2 mb-2">
            <FileAudio className="w-4 h-4 text-cyan-400" />
            Audio Total Produit
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {formatMinutes(stats.totalSeconds)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Durée cumulée</p>
        </div>

        <div className="bg-[#101322] p-5 rounded-2xl border border-white/5 shadow-xl">
          <div className="text-xs text-gray-400 flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Voix Personnalisées
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {stats.customVoicesCount}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Avatars vocaux actifs</p>
        </div>
      </div>

      {/* Mobile Android & Local Export Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-[#131526] to-indigo-950/60 p-6 rounded-3xl border border-purple-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-300 mb-1">
            <Smartphone className="w-4 h-4 text-purple-400" />
            Accès Mobile Android & Export Local
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">Utiliser Marius Voice AI sur Android & en Local</h3>
          <p className="text-xs text-gray-300 mt-1 leading-relaxed">
            Installez l'application sur votre smartphone sans passer par le store (PWA Chrome) ou téléchargez le code pour l'exécuter sur votre machine avec Node.js.
          </p>
        </div>
        {onOpenMobileInstall && (
          <button
            onClick={onOpenMobileInstall}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 transition-all cursor-pointer shrink-0"
          >
            <Smartphone className="w-4 h-4" />
            <span>Guide Mobile & Export</span>
          </button>
        )}
      </div>

      {/* Engine & Technical Architecture Specifications */}
      <div className="bg-[#101322] rounded-3xl border border-purple-500/20 p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            Spécifications Techniques du Moteur Audio
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Architecture IA et protocoles de rendu sonore intégrés à Marius Voice AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#090b14] p-4 rounded-2xl border border-white/5 space-y-2">
            <span className="text-purple-400 font-semibold block">Modèle de Synthèse Vocale (TTS)</span>
            <p className="text-gray-300 font-mono">gemini-3.8-flash-tts</p>
            <p className="text-gray-400 text-[11px]">
              Modèle de pointe Google AI Studio pour la prosodie naturelle, les nuances d'intonation, le dialogue et les effets vocaux (souffle &lt;breath&gt;, rire &lt;laugh&gt;, respiration &lt;gasp&gt;).
            </p>
          </div>

          <div className="bg-[#090b14] p-4 rounded-2xl border border-white/5 space-y-2">
            <span className="text-indigo-400 font-semibold block">Résolution & Taux d'Échantillonnage</span>
            <p className="text-gray-300 font-mono">24 000 Hz • 16-bit Mono PCM (Master RIFF WAV)</p>
            <p className="text-gray-400 text-[11px]">
              Qualité broadcast studio non compressée, garantissant un rendu limpide et sans artefacts d'aliasing pour les montages vidéo.
            </p>
          </div>

          <div className="bg-[#090b14] p-4 rounded-2xl border border-white/5 space-y-2">
            <span className="text-cyan-400 font-semibold block">Traitement des Textes Longs (Smart Segmentation)</span>
            <p className="text-gray-300">Découpage intelligent par phrases et paragraphes</p>
            <p className="text-gray-400 text-[11px]">
              Permet de générer des scripts de 4, 10 ou 20 minutes sans rupture phonétique grâce à la concaténation binaire continue des trames PCM.
            </p>
          </div>

          <div className="bg-[#090b14] p-4 rounded-2xl border border-white/5 space-y-2">
            <span className="text-emerald-400 font-semibold block">Formats d'Exportation Intégrés</span>
            <p className="text-gray-300 font-mono">WAV (Master HD) & MP3 (128 kbps)</p>
            <p className="text-gray-400 text-[11px]">
              Compatibilité immédiate avec tous les logiciels de montage : Adobe Premiere Pro, DaVinci Resolve, Final Cut Pro, CapCut, Audacity.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy, GDPR & Voice Consent Policy */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
          <div>
            <h3 className="text-base font-bold text-white">
              Protection des Données Vocales & Éthique Biométrique
            </h3>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              Marius Voice AI applique le principe de minimisation des données. Vos enregistrements de référence ne sont jamais partagés avec des tiers ni rendus publics. L'analyse acoustique est réalisée exclusivement pour configurer vos profils vocaux personnalisés.
            </p>
          </div>
        </div>

        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-xs text-gray-400 space-y-2">
          <p>
            • <strong>Droit à l'effacement :</strong> Vous pouvez supprimer vos profils vocaux et fichiers audio générés à tout moment depuis les interfaces dédiées.
          </p>
          <p>
            • <strong>Usage loyal :</strong> Le clonage de personnes vivantes ou décédées sans leur accord préalable explicite est strictement prohibé par nos conditions de service.
          </p>
        </div>

        {/* Clear Data Button */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-white">Réinitialisation des données locales</h4>
            <p className="text-[11px] text-gray-500">Efface les statistiques et le brouillon de script</p>
          </div>
          <button
            onClick={onClearAllData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Réinitialiser les stats
          </button>
        </div>
      </div>
    </div>
  );
};
