import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Sparkles,
  Play,
  RotateCcw,
  Sliders,
  FileText,
  Copy,
  ClipboardPaste,
  Trash2,
  Upload,
  BookOpen,
  Megaphone,
  Video,
  Flame,
  Compass,
  Trophy,
  Moon,
  Briefcase,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Mic,
  Clock,
  Gauge,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { CustomVoiceProfile, GenerationSegment, Voice } from '../types.ts';
import { VOICE_PRESETS, SAMPLE_SCRIPTS } from '../constants/presets.ts';
import { AdvancedAudioPlayer } from './AdvancedAudioPlayer.tsx';
import { concatenateAudioSegments, generateSingleSegment, splitScriptSegments } from '../services/api.ts';

interface TextToSpeechWorkspaceProps {
  voices: Voice[];
  customVoices: CustomVoiceProfile[];
  initialText?: string;
  initialVoiceId?: string;
  onGenerationComplete: (data: {
    creationId: string;
    text: string;
    voiceName: string;
    duration: number;
  }) => void;
  onNavigateToMyVoice: () => void;
}

export const TextToSpeechWorkspace: React.FC<TextToSpeechWorkspaceProps> = ({
  voices,
  customVoices,
  initialText = '',
  initialVoiceId = 'Kore',
  onGenerationComplete,
  onNavigateToMyVoice,
}) => {
  // Script state
  const [scriptText, setScriptText] = useState(() => {
    return initialText || localStorage.getItem('marius_tts_draft') || SAMPLE_SCRIPTS.commercial.text;
  });
  const [projectName, setProjectName] = useState('Projet Vocal Marius');

  // Selected Voice
  const [voiceCategory, setVoiceCategory] = useState<'studio' | 'custom'>('studio');
  const [selectedVoiceId, setSelectedVoiceId] = useState(initialVoiceId);

  // Settings
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState<'deep' | 'normal' | 'high'>('normal');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('commercial');
  const [customStyle, setCustomStyle] = useState(
    VOICE_PRESETS.find((p) => p.id === 'commercial')?.stylePrompt || ''
  );

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Generated Audio Result
  const [generatedWav, setGeneratedWav] = useState<string | null>(null);
  const [generatedMp3, setGeneratedMp3] = useState<string | null>(null);
  const [generatedDuration, setGeneratedDuration] = useState<number>(0);
  const [generatedSegments, setGeneratedSegments] = useState<GenerationSegment[]>([]);

  // Voice Preview Player
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-save draft in localStorage
  useEffect(() => {
    localStorage.setItem('marius_tts_draft', scriptText);
  }, [scriptText]);

  // Sync initial text if passed from outside
  useEffect(() => {
    if (initialText) {
      setScriptText(initialText);
    }
  }, [initialText]);

  // Sync initial voice if passed
  useEffect(() => {
    if (initialVoiceId) {
      // Check if it's custom or studio
      const isCustom = customVoices.some((v) => v.id === initialVoiceId);
      if (isCustom) {
        setVoiceCategory('custom');
        setSelectedVoiceId(initialVoiceId);
      } else {
        setVoiceCategory('studio');
        setSelectedVoiceId(initialVoiceId);
      }
    }
  }, [initialVoiceId, customVoices]);

  // Text statistics
  const charCount = scriptText.length;
  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  // Estimated duration in seconds (based on ~140 WPM French speech rate / speed factor)
  const estimatedSeconds = Math.round((wordCount / (140 * speechSpeed)) * 60);

  // Estimated segments count (assuming ~100 words per segment)
  const estimatedSegmentsCount = Math.max(1, Math.ceil(wordCount / 100));

  const formatEstimatedTime = (secs: number) => {
    if (secs <= 0) return '0 s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s} s`;
    return `${m} min ${s > 0 ? `${s} s` : ''}`;
  };

  // Preset Selection
  const applyPreset = (presetId: string) => {
    const preset = VOICE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPresetId(presetId);
    setCustomStyle(preset.stylePrompt);
    setSpeechSpeed(preset.speed);
    setVoicePitch(preset.pitch);

    // If on studio voices, select the recommended voice
    if (voiceCategory === 'studio') {
      setSelectedVoiceId(preset.recommendedVoice);
    }
  };

  // Insert Vocal Burst / Breathing tags
  const insertTag = (tag: string) => {
    setScriptText((prev) => `${prev} ${tag} `);
  };

  // Clipboard Paste
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setScriptText((prev) => (prev ? `${prev}\n\n${text}` : text));
      }
    } catch {
      setErrorNotice('Impossible d\'accéder au presse-papier.');
    }
  };

  // File Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setScriptText(content);
        setProjectName(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsText(file);
  };

  // Play Sample Voice Preview
  const handlePreviewVoice = async (voice: Voice) => {
    if (previewingVoiceId === voice.id && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewingVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voice.id);
    try {
      const result = await generateSingleSegment({
        text: voice.previewPrompt,
        voiceName: voice.id,
        style: 'Voix claire, chaleureuse et naturelle en français.',
      });

      if (result.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${result.audioBase64}`);
        audio.onended = () => setPreviewingVoiceId(null);
        audio.play();
        previewAudioRef.current = audio;
      }
    } catch (err: any) {
      console.error('Preview error:', err);
      setPreviewingVoiceId(null);
    }
  };

  // Main Generation Handler
  const handleGenerate = async () => {
    if (!scriptText.trim()) {
      setErrorNotice('Veuillez renseigner un texte à synthétiser.');
      return;
    }

    setIsGenerating(true);
    setErrorNotice(null);
    setGenerationStep('Découpage du script en segments continus...');
    setGenerationProgress(5);

    try {
      const isCustomVoice = voiceCategory === 'custom';
      const customProfile = isCustomVoice
        ? customVoices.find((v) => v.id === selectedVoiceId)
        : null;
      const activeVoice = customProfile ? customProfile.baseVoice || 'Kore' : selectedVoiceId;
      const enrichedStyle = customProfile
        ? `${customProfile.stylePrompt}. ${customStyle}`.trim()
        : customStyle;

      // 1. Split script into manageable segments (honoring paragraphs and sentences)
      let segmentsText: string[] = [];
      try {
        const splitRes = await splitScriptSegments(scriptText, 80);
        segmentsText = splitRes.segments;
      } catch {
        segmentsText = scriptText
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean);
        if (segmentsText.length === 0) segmentsText = [scriptText.trim()];
      }

      const totalSegments = segmentsText.length;
      setGenerationStep(`Préparation de la synthèse (${totalSegments} segment${totalSegments > 1 ? 's' : ''})...`);
      setGenerationProgress(10);

      const completedSegs: GenerationSegment[] = [];
      const segmentAudioB64s: string[] = [];

      // 2. Generate each segment progressively
      for (let i = 0; i < totalSegments; i++) {
        const segText = segmentsText[i];
        setGenerationStep(`Synthèse audio : segment ${i + 1} sur ${totalSegments}...`);
        const currentProg = Math.round(10 + (i / totalSegments) * 75);
        setGenerationProgress(currentProg);

        let segResult;
        let attempts = 0;
        let segSuccess = false;
        let lastSegErr: any = null;

        while (attempts < 2 && !segSuccess) {
          attempts++;
          try {
            segResult = await generateSingleSegment({
              text: segText,
              voiceName: activeVoice,
              style: enrichedStyle,
              speed: speechSpeed,
              pitch: voicePitch,
            });
            segSuccess = true;
          } catch (err: any) {
            lastSegErr = err;
            if (attempts < 2) {
              await new Promise((r) => setTimeout(r, 800));
            }
          }
        }

        if (!segSuccess || !segResult?.audioBase64) {
          throw new Error(`Échec de synthèse sur le segment ${i + 1}/${totalSegments} : ${lastSegErr?.message || 'Erreur de génération'}`);
        }

        segmentAudioB64s.push(segResult.audioBase64);
        completedSegs.push({
          index: i + 1,
          text: segText,
          audioBase64: segResult.audioBase64,
          duration: segResult.duration,
          byteSize: segResult.byteSize,
          status: 'completed',
        });
      }

      // 3. Assemble and concatenate all segments into seamless master audio
      setGenerationStep('Assemblage et égalisation du fichier master...');
      setGenerationProgress(90);

      const concatRes = await concatenateAudioSegments({
        segmentBase64s: segmentAudioB64s,
        projectName,
        text: scriptText,
        voiceName: activeVoice,
        customVoiceId: isCustomVoice ? selectedVoiceId : null,
        style: enrichedStyle,
        speed: speechSpeed,
        pitch: voicePitch,
      });

      if (concatRes.success) {
        setGeneratedWav(concatRes.wavBase64);
        setGeneratedDuration(concatRes.duration);
        setGeneratedSegments(completedSegs);

        onGenerationComplete({
          creationId: concatRes.creationId,
          text: scriptText,
          voiceName: activeVoice,
          duration: concatRes.duration,
        });

        setGenerationProgress(100);
        setGenerationStep('Génération terminée avec succès !');
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorNotice(err.message || 'Une erreur est survenue pendant la génération vocale.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* SECTION 1: Text Script Editor */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-5 sm:p-7 shadow-2xl relative">
        {/* Editor Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Nom du projet"
              className="bg-transparent font-bold text-base sm:text-lg text-white focus:outline-none focus:border-b focus:border-purple-500 max-w-[240px] sm:max-w-xs"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handlePaste}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-colors"
              title="Coller depuis le presse-papier"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Coller</span>
            </button>

            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importer .txt</span>
              <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => setScriptText('')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-xs text-gray-400 hover:text-red-300 transition-colors"
              title="Effacer le texte"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Effacer</span>
            </button>
          </div>
        </div>

        {/* Vocal Bursts & Breathing Expression Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3 p-2 bg-[#0a0c16] rounded-xl border border-white/5 text-xs">
          <span className="text-[11px] font-semibold text-gray-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            Effets vocaux expressifs :
          </span>
          <button
            onClick={() => insertTag('<breath>')}
            className="px-2 py-1 rounded bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-mono text-[11px] transition-colors"
            title="Insérer une respiration naturelle"
          >
            &lt;breath&gt;
          </button>
          <button
            onClick={() => insertTag('<laugh>')}
            className="px-2 py-1 rounded bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-mono text-[11px] transition-colors"
            title="Insérer un rire subtil"
          >
            &lt;laugh&gt;
          </button>
          <button
            onClick={() => insertTag('<gasp>')}
            className="px-2 py-1 rounded bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-mono text-[11px] transition-colors"
            title="Insérer une inspiration de surprise"
          >
            &lt;gasp&gt;
          </button>
          <button
            onClick={() => insertTag('|mhm|')}
            className="px-2 py-1 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 font-mono text-[11px] transition-colors"
            title="Insérer une approbation vocale"
          >
            |mhm|
          </button>
          <button
            onClick={() => insertTag('|yeah|')}
            className="px-2 py-1 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 font-mono text-[11px] transition-colors"
            title="Insérer un accord spontané"
          >
            |yeah|
          </button>

          {/* Sample Scripts Selector */}
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[11px] text-gray-500 hidden md:inline">Modèles de script :</span>
            <select
              onChange={(e) => {
                const sample = SAMPLE_SCRIPTS[e.target.value];
                if (sample) {
                  setScriptText(sample.text);
                  setProjectName(sample.title);
                  applyPreset(sample.preset);
                }
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-gray-300 focus:outline-none focus:border-purple-500"
            >
              <option value="">Charger un exemple...</option>
              <option value="commercial">Spot Publicitaire</option>
              <option value="tiktok">Script TikTok / Reels</option>
              <option value="documentary">Documentaire Long</option>
              <option value="storytelling">Conte Immersif</option>
              <option value="motivational">Discours Motivationnel</option>
            </select>
          </div>
        </div>

        {/* Large Text Area */}
        <textarea
          rows={7}
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          placeholder="Écrivez ou collez votre script ici... Marius Voice AI prend en charge des textes de plusieurs minutes sans coupure grâce au découpage intelligent."
          className="w-full bg-[#080a12] border border-white/10 focus:border-purple-500/80 rounded-2xl p-4 sm:p-5 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none transition-all resize-y leading-relaxed"
        />

        {/* Live Metrics Footer & Long Script Segmentation Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-white/5 text-xs text-gray-400">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              <strong className="text-white font-mono">{charCount}</strong> caractères
            </span>
            <span>
              <strong className="text-white font-mono">{wordCount}</strong> mots
            </span>
            <span className="flex items-center gap-1 text-purple-300 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Durée estimée : ~{formatEstimatedTime(estimatedSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-300">
              <Layers className="w-3 h-3 text-cyan-400" />
              {estimatedSegmentsCount === 1 ? (
                '1 segment direct'
              ) : (
                <span>
                  <strong>{estimatedSegmentsCount} segments</strong> continus (assemblage automatique)
                </span>
              )}
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Brouillon sauvegardé
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Voice Presets (10 Professional Styles) */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-5 sm:p-7 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Styles de Voix & Presets Professionnels
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Optimisez l'intonation et le dynamisme selon votre format de diffusion
            </p>
          </div>
        </div>

        {/* Horizontal scrollable / grid presets */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
          {VOICE_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-gradient-to-b from-purple-900/40 to-indigo-900/30 border-purple-500/60 shadow-lg shadow-purple-900/20 text-white'
                    : 'bg-[#090b14] border-white/5 hover:border-white/15 text-gray-300'
                }`}
              >
                <div className="font-semibold text-xs truncate mb-1">{preset.name}</div>
                <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Voice Selection (Studio Voices vs My Voice) */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-purple-400" />
              Bibliothèque Vocale (Gemini 3.8 TTS)
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Sélectionnez une voix studio officielle ou utilisez votre avatar vocal personnalisé
            </p>
          </div>

          {/* Voice Category Switcher */}
          <div className="flex items-center bg-[#090b14] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => {
                setVoiceCategory('studio');
                setSelectedVoiceId('Kore');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                voiceCategory === 'studio'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Voix Studio ({voices.length})
            </button>
            <button
              onClick={() => {
                setVoiceCategory('custom');
                if (customVoices.length > 0) {
                  setSelectedVoiceId(customVoices[0].id);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                voiceCategory === 'custom'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Mic className="w-3 h-3" />
              Mes Voix ({customVoices.length})
            </button>
          </div>
        </div>

        {/* Studio Voices Grid */}
        {voiceCategory === 'studio' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {voices.map((voice) => {
              const isSelected = selectedVoiceId === voice.id;
              const isPreviewing = previewingVoiceId === voice.id;

              return (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoiceId(voice.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500/70 shadow-lg shadow-purple-900/30 ring-1 ring-purple-500/50'
                      : 'bg-[#090b14] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-white">{voice.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-medium">
                          {voice.gender === 'female' ? 'Féminin' : 'Masculin'}
                        </span>
                      </div>
                      <p className="text-xs text-purple-300 mt-0.5 font-medium">{voice.tone}</p>
                    </div>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewVoice(voice);
                      }}
                      className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 transition-colors shrink-0"
                      title="Écouter un extrait de cette voix"
                    >
                      {isPreviewing ? (
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                    {voice.description}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {voice.recommendedFor.slice(0, 2).map((rec, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-white/5 border border-white/5 px-2 py-0.5 rounded-md text-gray-300"
                      >
                        {rec}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom Voices Tab */}
        {voiceCategory === 'custom' && (
          <div>
            {customVoices.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-white/10 rounded-2xl bg-[#090b14]">
                <Mic className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-300">Aucune voix personnalisée créée</p>
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  Enregistrez votre propre voix pour générer du contenu avec votre empreinte vocale unique.
                </p>
                <button
                  type="button"
                  onClick={onNavigateToMyVoice}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow"
                >
                  Ouvrir le Studio "Ma Voix"
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customVoices.map((cVoice) => {
                  const isSelected = selectedVoiceId === cVoice.id;
                  return (
                    <div
                      key={cVoice.id}
                      onClick={() => setSelectedVoiceId(cVoice.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-950/40 border-purple-500/70 shadow-lg shadow-purple-900/30 ring-1 ring-purple-500/50'
                          : 'bg-[#090b14] border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold text-sm text-white">{cVoice.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Base {cVoice.baseVoice}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-2">{cVoice.description}</p>
                      <span className="text-[11px] font-mono text-purple-300 bg-white/5 p-1.5 rounded block line-clamp-1">
                        {cVoice.stylePrompt}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: Fine-Tuning Speech Settings */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-5 sm:p-7 shadow-xl space-y-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-purple-400" />
          Paramètres Acoustiques & Narration
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Speed slider */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-gray-300 mb-2">
              <span>Débit vocal</span>
              <span className="font-mono text-purple-400">{speechSpeed}x</span>
            </div>
            <input
              type="range"
              min={0.75}
              max={1.4}
              step={0.05}
              value={speechSpeed}
              onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>Posé (0.75x)</span>
              <span>Normal (1.0x)</span>
              <span>Dynamique (1.4x)</span>
            </div>
          </div>

          {/* Pitch selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Tonalité (Pitch)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVoicePitch('deep')}
                className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                  voicePitch === 'deep'
                    ? 'bg-purple-600/30 border-purple-500 text-purple-300 font-bold'
                    : 'bg-[#090b14] border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Grave
              </button>
              <button
                type="button"
                onClick={() => setVoicePitch('normal')}
                className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                  voicePitch === 'normal'
                    ? 'bg-purple-600/30 border-purple-500 text-purple-300 font-bold'
                    : 'bg-[#090b14] border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Neutre
              </button>
              <button
                type="button"
                onClick={() => setVoicePitch('high')}
                className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                  voicePitch === 'high'
                    ? 'bg-purple-600/30 border-purple-500 text-purple-300 font-bold'
                    : 'bg-[#090b14] border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Aigu
              </button>
            </div>
          </div>

          {/* Engine model badge */}
          <div className="bg-[#090b14] p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
              Moteur Connecté
            </span>
            <div>
              <p className="text-xs font-bold text-white font-mono">gemini-3.8-flash-tts</p>
              <p className="text-[11px] text-purple-300 mt-0.5">24 kHz Mono Master RIFF WAV</p>
            </div>
          </div>
        </div>

        {/* Custom Style Prompt Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Instruction de style narratif personnalisée (Transmise à Gemini 3.8)
          </label>
          <input
            type="text"
            value={customStyle}
            onChange={(e) => setCustomStyle(e.target.value)}
            placeholder="Ex: Parler d'une voix posée et captivante avec des respirations douces en français..."
            className="w-full bg-[#090b14] border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
          />
        </div>
      </div>

      {/* SECTION 5: Generation Action Bar */}
      <div className="space-y-4">
        {errorNotice && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-xs sm:text-sm text-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block mb-0.5 font-semibold">Erreur de génération :</strong>
              <p>{errorNotice}</p>
              <p className="text-gray-400 text-xs mt-1">
                Votre script n'a pas été perdu. Vous pouvez modifier vos réglages et réessayer immédiatement.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shrink-0"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Big Generate Button */}
        <div className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-950/50 via-[#101322] to-indigo-950/50 border border-purple-500/30 shadow-2xl">
          <div className="hidden sm:block">
            <p className="text-xs text-gray-400">
              Voix : <strong className="text-white">{selectedVoiceId}</strong> • Débit :{' '}
              <strong className="text-white">{speechSpeed}x</strong>
            </p>
            <p className="text-[11px] text-purple-300">
              Rendu master WAV HD & encodage MP3 automatique
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !scriptText.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-400 hover:from-purple-500 hover:to-cyan-300 text-white text-base font-extrabold shadow-2xl shadow-purple-900/50 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGenerating ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Génération audio en cours...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5" />
                <span>Générer la Voix Audio (~{formatEstimatedTime(estimatedSeconds)})</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Bar when Generating */}
        {isGenerating && (
          <div className="p-4 rounded-2xl bg-[#0e111d] border border-purple-500/30 space-y-2">
            <div className="flex justify-between text-xs text-gray-300">
              <span>{generationStep}</span>
              <span className="font-mono text-purple-400">{generationProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${generationProgress}%` }}
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300 rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 6: Advanced Audio Player Result */}
      {generatedWav && (
        <div className="pt-2">
          <AdvancedAudioPlayer
            wavBase64={generatedWav}
            mp3Base64={generatedMp3 || undefined}
            projectName={projectName}
            duration={generatedDuration}
            segments={generatedSegments}
            onSegmentRetry={async (index) => {
              // Retry single segment
              const target = generatedSegments.find((s) => s.index === index);
              if (!target) return;
              try {
                const retryRes = await generateSingleSegment({
                  text: target.text,
                  voiceName: selectedVoiceId,
                  style: customStyle,
                  speed: speechSpeed,
                  pitch: voicePitch,
                });
                if (retryRes.audioBase64) {
                  setGeneratedSegments((prev) =>
                    prev.map((s) =>
                      s.index === index
                        ? { ...s, audioBase64: retryRes.audioBase64, status: 'completed' }
                        : s
                    )
                  );
                }
              } catch (err: any) {
                console.error('Segment retry error:', err);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};
