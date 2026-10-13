import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  X,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  CheckCircle2,
  Share2,
  Sparkles,
} from 'lucide-react';

interface MobileInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileInstallModal: React.FC<MobileInstallModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'android' | 'local'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);

  const sharedUrl = 'https://ais-pre-wlk23xqbdtofzpfpgxw43l-635059243381.us-east1.run.app';

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        onClose();
      }
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(sharedUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const copyLocalCode = () => {
    const bash = `# 1. Cloner ou dézipper le projet
git clone <url_du_repo>
cd marius-voice-ai

# 2. Installer les dépendances
npm install

# 3. Configurer votre clé API Gemini dans .env
echo 'GEMINI_API_KEY="VOTRE_CLE_API_ICI"' > .env

# 4. Lancer le serveur local
npm run dev`;
    navigator.clipboard.writeText(bash);
    setIsCodeCopied(true);
    setTimeout(() => setIsCodeCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#101322] border border-purple-500/30 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Accès Multiplateforme
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            Installer ou Exporter Marius Voice AI
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Utilisez l'application sur votre smartphone Android ou exécutez-la sur votre propre ordinateur.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-[#0a0c16] p-1.5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Sur Téléphone Android
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'local'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Laptop className="w-4 h-4" />
            En Local (Ordinateur)
          </button>
        </div>

        {/* TAB 1: Android Phone Guide */}
        {activeTab === 'android' && (
          <div className="space-y-4">
            {/* Native Install Prompt if available */}
            {deferredPrompt && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/40 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white">Installation directe prête !</h4>
                  <p className="text-[11px] text-gray-300">
                    Installez l'application sur votre écran d'accueil en 1 clic.
                  </p>
                </div>
                <button
                  onClick={handleNativeInstall}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 transition-all cursor-pointer shrink-0"
                >
                  Installer
                </button>
              </div>
            )}

            {/* Step-by-Step for Android Chrome */}
            <div className="bg-[#090b14] p-4 sm:p-5 rounded-2xl border border-white/5 space-y-3.5 text-xs">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px]">
                  1
                </span>
                Ouvrir l'application dans Chrome sur votre smartphone
              </h4>

              {/* Shared URL box */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 font-mono text-[11px] text-purple-300">
                <span className="truncate">{sharedUrl}</span>
                <button
                  onClick={copyUrl}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-sans text-xs font-semibold shrink-0 cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>

              <div className="pt-2 space-y-2.5 border-t border-white/5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="text-gray-300">
                    Dans Chrome sur votre téléphone, appuyez sur les <strong>trois points verticaux ⋮</strong> en haut à droite.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="text-gray-300">
                    Sélectionnez <strong>« Ajouter à l'écran d'accueil »</strong> (ou « Installer l'application »).
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-gray-300">
                    L'icône <strong>Marius Voice AI</strong> apparaît sur votre écran d'accueil et s'ouvre en <strong>plein écran</strong> sans barre d'adresse de navigateur, avec enregistrement micro fluide et téléchargements audio directs !
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Local Export (PC / Mac / Linux) */}
        {activeTab === 'local' && (
          <div className="space-y-3.5 text-xs">
            <p className="text-gray-300 leading-relaxed">
              Pour faire tourner Marius Voice AI sur votre propre machine avec <strong>Node.js</strong> :
            </p>

            <div className="bg-[#090b14] p-4 rounded-2xl border border-white/5 space-y-2 relative">
              <div className="flex justify-between items-center text-[11px] text-gray-400 pb-1 border-b border-white/5">
                <span className="font-mono">Terminal Bash / PowerShell</span>
                <button
                  onClick={copyLocalCode}
                  className="flex items-center gap-1 text-purple-300 hover:text-white cursor-pointer"
                >
                  {isCodeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCodeCopied ? 'Commandes copiées !' : 'Copier tout'}</span>
                </button>
              </div>

              <pre className="font-mono text-[11px] text-gray-300 overflow-x-auto whitespace-pre leading-relaxed">
{`# 1. Installer les dépendances
npm install

# 2. Configurer votre clé API dans .env
GEMINI_API_KEY="VOTRE_CLE_API_GEMINI"

# 3. Lancer le serveur local
npm run dev`}
              </pre>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 text-[11px] space-y-1">
              <p>
                • Votre serveur local démarrera sur <strong>http://localhost:3000</strong>.
              </p>
              <p>
                • Une clé API Gemini gratuite peut être générée sur{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-300 hover:underline font-semibold"
                >
                  Google AI Studio (aistudio.google.com)
                </a>.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
