import { Mic, Radio, Library, Sliders, Sparkles, Volume2, Smartphone } from 'lucide-react';

interface NavbarProps {
  activeTab: 'tts' | 'my-voice' | 'creations' | 'settings';
  setActiveTab: (tab: 'tts' | 'my-voice' | 'creations' | 'settings') => void;
  creationsCount: number;
  customVoicesCount: number;
  isGenerating?: boolean;
  onOpenMobileInstall?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  creationsCount,
  customVoicesCount,
  isGenerating,
  onOpenMobileInstall,
}) => {
  return (
    <>
      {/* Top Desktop & Mobile Header */}
      <header className="sticky top-0 z-40 bg-[#0c0e17]/90 backdrop-blur-md border-b border-purple-900/20 px-4 lg:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('tts')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-purple-900/40">
              <div className="w-full h-full bg-[#0d0f19] rounded-[11px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-purple-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
                  MARIUS VOICE AI
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  <Sparkles className="w-2.5 h-2.5" />
                  Studio 3.8
                </span>
              </div>
              <p className="text-[11px] text-gray-400 hidden sm:block">
                Synthèse Vocale HD & Clonage de Voix Personnalisé
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#131625] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('tts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'tts'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              Synthèse Vocale
            </button>

            <button
              onClick={() => setActiveTab('my-voice')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === 'my-voice'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Mic className="w-4 h-4" />
              Ma Voix
              {customVoicesCount > 0 && (
                <span className="ml-1 text-[10px] bg-purple-400/20 text-purple-300 border border-purple-400/30 px-1.5 py-0.2 rounded-full font-bold">
                  {customVoicesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('creations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === 'creations'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Library className="w-4 h-4" />
              Mes Créations
              {creationsCount > 0 && (
                <span className="ml-1 text-[10px] bg-white/10 text-gray-200 px-1.5 py-0.2 rounded-full font-bold">
                  {creationsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-4 h-4" />
              Paramètres
            </button>
          </nav>

          {/* Right Status Pill */}
          {/* Right Status Pill & Mobile Install Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onOpenMobileInstall && (
              <button
                onClick={onOpenMobileInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-purple-900/30"
                title="Installer sur votre smartphone Android"
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Installer Mobile</span>
                <span className="sm:hidden text-[11px]">Installer</span>
              </button>
            )}

            {isGenerating ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                Génération...
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Gemini 3.8 TTS
              </div>
            )}
            <button
              onClick={() => setActiveTab('settings')}
              className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
              aria-label="Paramètres"
            >
              <Sliders className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0f19]/95 backdrop-blur-lg border-t border-purple-900/20 px-2 py-2">
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('tts')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              activeTab === 'tts'
                ? 'text-purple-400 font-semibold bg-purple-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Volume2 className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] leading-tight">Synthèse</span>
          </button>

          <button
            onClick={() => setActiveTab('my-voice')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all relative ${
              activeTab === 'my-voice'
                ? 'text-purple-400 font-semibold bg-purple-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="relative">
              <Mic className="w-5 h-5 mb-0.5" />
              {customVoicesCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-purple-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                  {customVoicesCount}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-tight">Ma Voix</span>
          </button>

          <button
            onClick={() => setActiveTab('creations')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all relative ${
              activeTab === 'creations'
                ? 'text-purple-400 font-semibold bg-purple-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="relative">
              <Library className="w-5 h-5 mb-0.5" />
              {creationsCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-indigo-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                  {creationsCount}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-tight">Créations</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              activeTab === 'settings'
                ? 'text-purple-400 font-semibold bg-purple-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] leading-tight">Réglages</span>
          </button>
        </div>
      </nav>
    </>
  );
};
