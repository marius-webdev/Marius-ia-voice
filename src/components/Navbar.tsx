import React, { useState, useEffect } from 'react';
import {
  Mic,
  Radio,
  Library,
  Sliders,
  Sparkles,
  Volume2,
  Smartphone,
  Key,
  Gauge,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { apiKeyManager } from '../services/apiKeyManager.ts';

export type TabType = 'tts' | 'my-voice' | 'creations' | 'quotas' | 'api-key' | 'settings';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
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
  const [hasApiKey, setHasApiKey] = useState(() => apiKeyManager.hasKey());

  useEffect(() => {
    // Keep key indicator in sync
    const check = () => setHasApiKey(apiKeyManager.hasKey());
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Top Desktop & Mobile Header */}
      <header className="sticky top-0 z-40 bg-[#0c0e17]/95 backdrop-blur-md border-b border-purple-900/20 px-3 sm:px-6 lg:px-8 py-2.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer" onClick={() => setActiveTab('tts')}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-purple-900/40">
              <div className="w-full h-full bg-[#0d0f19] rounded-[11px] flex items-center justify-center">
                <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
                  MARIUS VOICE AI
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  <Sparkles className="w-2.5 h-2.5" />
                  Studio 3.8
                </span>
              </div>
              <p className="text-[11px] text-gray-400 hidden sm:block">
                Synthèse Vocale HD & Voice Design Personnalisé
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#131625] p-1 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => setActiveTab('tts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'tts'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              Synthèse Vocale
            </button>

            <button
              onClick={() => setActiveTab('my-voice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all relative cursor-pointer ${
                activeTab === 'my-voice'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Ma Voix
              {customVoicesCount > 0 && (
                <span className="ml-1 text-[10px] bg-purple-400/20 text-purple-300 border border-purple-400/30 px-1.5 py-0.2 rounded-full font-bold">
                  {customVoicesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('creations')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all relative cursor-pointer ${
                activeTab === 'creations'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Library className="w-3.5 h-3.5" />
              Créations
              {creationsCount > 0 && (
                <span className="ml-1 text-[10px] bg-white/10 text-gray-200 px-1.5 py-0.2 rounded-full font-bold">
                  {creationsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('quotas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'quotas'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              Quotas & Conso
            </button>

            <button
              onClick={() => setActiveTab('api-key')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all relative cursor-pointer ${
                activeTab === 'api-key'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              Clé API
              <span className={`w-2 h-2 rounded-full ml-1 ${hasApiKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Réglages
            </button>
          </nav>

          {/* Right Status Pill & Mobile Install Button */}
          <div className="flex items-center gap-2">
            {/* Quick Key Status button */}
            <button
              type="button"
              onClick={() => setActiveTab('api-key')}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                hasApiKey
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/40'
              }`}
              title="Gérer votre clé API personnelle Google Gemini"
            >
              {hasApiKey ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Clé Active</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px]">Configurer Clé API</span>
                </>
              )}
            </button>

            {onOpenMobileInstall && (
              <button
                onClick={onOpenMobileInstall}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-purple-900/30"
                title="Installer sur votre smartphone Android"
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Installer Mobile</span>
                <span className="sm:hidden text-[11px]">Mobile</span>
              </button>
            )}

            {isGenerating && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                <span className="text-[11px]">Génération...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Navigation for Mobile Devices */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0c14]/95 backdrop-blur-lg border-t border-white/10 px-2 py-1 shadow-2xl">
        <div className="grid grid-cols-6 gap-0.5 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('tts')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'tts'
                ? 'text-purple-400 font-semibold bg-purple-500/15'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Volume2 className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] leading-tight">Synthèse</span>
          </button>

          <button
            onClick={() => setActiveTab('my-voice')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all relative cursor-pointer ${
              activeTab === 'my-voice'
                ? 'text-purple-400 font-semibold bg-purple-500/15'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="relative">
              <Mic className="w-4 h-4 mb-0.5" />
              {customVoicesCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-purple-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                  {customVoicesCount}
                </span>
              )}
            </div>
            <span className="text-[9px] leading-tight">Ma Voix</span>
          </button>

          <button
            onClick={() => setActiveTab('creations')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all relative cursor-pointer ${
              activeTab === 'creations'
                ? 'text-purple-400 font-semibold bg-purple-500/15'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="relative">
              <Library className="w-4 h-4 mb-0.5" />
              {creationsCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-indigo-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                  {creationsCount}
                </span>
              )}
            </div>
            <span className="text-[9px] leading-tight">Projets</span>
          </button>

          <button
            onClick={() => setActiveTab('quotas')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'quotas'
                ? 'text-purple-400 font-semibold bg-purple-500/15'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Gauge className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] leading-tight">Quotas</span>
          </button>

          <button
            onClick={() => setActiveTab('api-key')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all relative cursor-pointer ${
              activeTab === 'api-key'
                ? 'text-purple-400 font-semibold bg-purple-500/15'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="relative">
              <Key className="w-4 h-4 mb-0.5" />
              <span className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </div>
            <span className="text-[9px] leading-tight">Clé API</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'text-purple-400 font-semibold bg-purple-500/15'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] leading-tight">Réglages</span>
          </button>
        </div>
      </nav>
    </>
  );
};
