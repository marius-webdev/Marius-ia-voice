import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { TextToSpeechWorkspace } from './components/TextToSpeechWorkspace.tsx';
import { MyVoiceStudio } from './components/MyVoiceStudio.tsx';
import { CreationsLibrary } from './components/CreationsLibrary.tsx';
import { UsageStatsView } from './components/UsageStatsView.tsx';
import { ApiKeySettingsView } from './components/ApiKeySettingsView.tsx';
import { QuotaDashboardView } from './components/QuotaDashboardView.tsx';
import { MobileInstallModal } from './components/MobileInstallModal.tsx';
import { CustomVoiceProfile, SavedCreation, TabType, UserStats, Voice } from './types.ts';
import { getCreations, getCustomVoices, getVoices } from './services/api.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('tts');
  const [isMobileInstallOpen, setIsMobileInstallOpen] = useState(false);

  // State
  const [voices, setVoices] = useState<Voice[]>([]);
  const [customVoices, setCustomVoices] = useState<CustomVoiceProfile[]>([]);
  const [creations, setCreations] = useState<SavedCreation[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Cross-tab editor state (allows passing project/voice from other tabs)
  const [editorText, setEditorText] = useState<string>('');
  const [editorVoiceId, setEditorVoiceId] = useState<string>('Kore');
  const [editorProjectName, setEditorProjectName] = useState<string>('Projet Vocal Marius');
  const [editorSpeed, setEditorSpeed] = useState<number>(1.0);
  const [editorPitch, setEditorPitch] = useState<'deep' | 'normal' | 'high'>('normal');
  const [editorStyle, setEditorStyle] = useState<string>('');
  const [editorSegments, setEditorSegments] = useState<any[]>([]);

  // Persistent user stats
  const [userStats, setUserStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem('marius_voice_stats');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      totalGenerations: 0,
      totalCharacters: 0,
      totalSeconds: 0,
      customVoicesCount: 0,
    };
  });

  // Save stats
  useEffect(() => {
    localStorage.setItem('marius_voice_stats', JSON.stringify(userStats));
  }, [userStats]);

  // Initial Data Load
  useEffect(() => {
    async function init() {
      try {
        const [voicesRes, customVoicesRes, creationsRes] = await Promise.all([
          getVoices().catch(() => ({ voices: [] })),
          getCustomVoices().catch(() => ({ customVoices: [] })),
          getCreations().catch(() => ({ creations: [] })),
        ]);

        if (voicesRes.voices && voicesRes.voices.length > 0) {
          setVoices(voicesRes.voices);
        }
        if (customVoicesRes.customVoices) {
          setCustomVoices(customVoicesRes.customVoices);
          setUserStats((prev) => ({
            ...prev,
            customVoicesCount: customVoicesRes.customVoices.length,
          }));
        }
        if (creationsRes.creations) {
          setCreations(creationsRes.creations);
        }
      } catch (err) {
        console.error('Initial data fetch error:', err);
      } finally {
        setIsLoadingInitial(false);
      }
    }
    init();
  }, []);

  // Handlers
  const handleVoiceCreated = (newVoice: CustomVoiceProfile) => {
    setCustomVoices((prev) => [newVoice, ...prev]);
    setUserStats((prev) => ({
      ...prev,
      customVoicesCount: prev.customVoicesCount + 1,
    }));
  };

  const handleVoiceDeleted = (id: string) => {
    setCustomVoices((prev) => prev.filter((v) => v.id !== id));
    setUserStats((prev) => ({
      ...prev,
      customVoicesCount: Math.max(0, prev.customVoicesCount - 1),
    }));
  };

  const handleSelectVoiceForTTS = (voiceId: string) => {
    setEditorVoiceId(voiceId);
    setActiveTab('tts');
  };

  const handleCreationComplete = (data: {
    creationId: string;
    text: string;
    voiceName: string;
    duration: number;
  }) => {
    // Refresh creations list
    getCreations()
      .then((res) => {
        if (res.creations) setCreations(res.creations);
      })
      .catch((e) => console.error(e));

    // Update stats
    setUserStats((prev) => ({
      ...prev,
      totalGenerations: prev.totalGenerations + 1,
      totalCharacters: prev.totalCharacters + data.text.length,
      totalSeconds: Math.round(prev.totalSeconds + data.duration),
    }));
  };

  const handleCreationDeleted = (id: string) => {
    setCreations((prev) => prev.filter((c) => c.id !== id));
  };

  const handleOpenCreationInEditor = (item: {
    id?: string;
    name?: string;
    text: string;
    voiceName: string;
    speed?: number;
    pitch?: 'deep' | 'normal' | 'high';
    style?: string;
    segments?: any[];
  }) => {
    setEditorText(item.text);
    setEditorVoiceId(item.voiceName);
    if (item.name) setEditorProjectName(item.name);
    if (item.speed) setEditorSpeed(item.speed);
    if (item.pitch) setEditorPitch(item.pitch);
    if (item.style) setEditorStyle(item.style);
    if (item.segments) setEditorSegments(item.segments);
    setActiveTab('tts');
  };

  const handleStartNewProject = () => {
    setEditorText('');
    setEditorProjectName('Nouveau Projet Vocal');
    setEditorSegments([]);
    setActiveTab('tts');
  };

  const handleClearAllStats = () => {
    const fresh: UserStats = {
      totalGenerations: 0,
      totalCharacters: 0,
      totalSeconds: 0,
      customVoicesCount: customVoices.length,
    };
    setUserStats(fresh);
    localStorage.removeItem('marius_voice_stats');
    localStorage.removeItem('marius_tts_draft');
  };

  return (
    <div className="min-h-screen bg-[#090a10] text-[#f1f3f9] flex flex-col font-sans selection:bg-purple-600/30 selection:text-purple-200">
      {/* Top and Mobile Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        creationsCount={creations.length}
        customVoicesCount={customVoices.length}
        onOpenMobileInstall={() => setIsMobileInstallOpen(true)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full mb-16 md:mb-8">
        {isLoadingInitial ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 font-medium">
              Initialisation du studio Marius Voice AI...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'tts' && (
              <TextToSpeechWorkspace
                voices={voices}
                customVoices={customVoices}
                initialText={editorText}
                initialVoiceId={editorVoiceId}
                initialProjectName={editorProjectName}
                initialSpeed={editorSpeed}
                initialPitch={editorPitch}
                initialStyle={editorStyle}
                initialSegments={editorSegments}
                onGenerationComplete={handleCreationComplete}
                onNavigateToMyVoice={() => setActiveTab('my-voice')}
                onNavigateToApiKey={() => setActiveTab('api-key')}
                onNavigateToQuotas={() => setActiveTab('quotas')}
                onNavigateToProjects={() => setActiveTab('creations')}
              />
            )}

            {activeTab === 'my-voice' && (
              <MyVoiceStudio
                customVoices={customVoices}
                onVoiceCreated={handleVoiceCreated}
                onVoiceDeleted={handleVoiceDeleted}
                onSelectForTTS={handleSelectVoiceForTTS}
              />
            )}

            {activeTab === 'creations' && (
              <CreationsLibrary
                creations={creations}
                onDeleteSuccess={handleCreationDeleted}
                onOpenInEditor={handleOpenCreationInEditor}
                onNewProject={handleStartNewProject}
              />
            )}

            {activeTab === 'quotas' && (
              <QuotaDashboardView
                onNavigateToApiKey={() => setActiveTab('api-key')}
                onNavigateToTTS={() => setActiveTab('tts')}
              />
            )}

            {activeTab === 'api-key' && (
              <ApiKeySettingsView
                onKeyConfigured={() => setActiveTab('tts')}
                onNavigateToTTS={() => setActiveTab('tts')}
                onNavigateToQuotas={() => setActiveTab('quotas')}
              />
            )}

            {activeTab === 'settings' && (
              <UsageStatsView
                stats={userStats}
                onClearAllData={handleClearAllStats}
                onOpenMobileInstall={() => setIsMobileInstallOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile PWA & Local Export Modal */}
      <MobileInstallModal
        isOpen={isMobileInstallOpen}
        onClose={() => setIsMobileInstallOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-gray-500 hidden md:block">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-gray-400">Marius Voice AI</span> • Studio Professionnel de Synthèse Vocale & Voice Design
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <button
              onClick={() => setActiveTab('api-key')}
              className="hover:text-purple-300 transition-colors cursor-pointer"
            >
              Ma clé API Google
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab('quotas')}
              className="hover:text-purple-300 transition-colors cursor-pointer"
            >
              Quotas & Conso
            </button>
            <span>•</span>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-300 transition-colors"
            >
              Google AI Studio
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
