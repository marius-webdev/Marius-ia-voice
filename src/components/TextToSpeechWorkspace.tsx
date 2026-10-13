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
  Key,
  Pause,
  RefreshCw,
  Info,
} from 'lucide-react';
import { CustomVoiceProfile, GenerationSegment, Voice } from '../types.ts';
import { VOICE_PRESETS, SAMPLE_SCRIPTS } from '../constants/presets.ts';
import { AdvancedAudioPlayer } from './AdvancedAudioPlayer.tsx';
import { concatenateAudioSegments, generateSingleSegment, splitScriptSegments } from '../services/api.ts';
import { apiKeyManager } from '../services/apiKeyManager.ts';

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
  onNavigateToApiKey?: () => void;
  onNavigateToQuotas?: () => void;
}

export const TextToSpeechWorkspace: React.FC<TextToSpeechWorkspaceProps> = ({
  voices,
  customVoices,
  initialText = '',
  initialVoiceId = 'Kore',
  onGenerationComplete,
  onNavigateToMyVoice,
  onNavigateToApiKey,
  onNavigateToQuotas,
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

  // Restore incomplete multi-segment job from previous session if available
  useEffect(() => {
    try {
      const savedJob = localStorage.getItem('marius_active_tts_job');
      if (savedJob) {
        const parsed = JSON.parse(savedJob);
        if (parsed.segments && parsed.segments.length > 0 && !parsed.isCompleted) {
          setSegments(parsed.segments);
          if (parsed.scriptText) setScriptText(parsed.scriptText);
          if (parsed.projectName) setProjectName(parsed.projectName);
          if (parsed.voiceName) setSelectedVoiceId(parsed.voiceName);
          setIsPaused(true);
          const completedCount = parsed.segments.filter((s: any) => s.status === 'completed').length;
          setGenerationStep(`Projet en cours restauré : ${completedCount}/${parsed.segments.length} segments déjà prêts.`);
        }
      }
    } catch {}
  }, []);

  // Sync initial text if passed from outside
  useEffect(() => {
    if (initialText) {
      setScriptText(initialText);
    }
  }, [initialText]);

  // Sync initial voice if passed
  useEffect(() => {
    if (initialVoiceId) {
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

  // Advanced Asynchronous Queue & Generation State
  const [segments, setSegments] = useState<GenerationSegment[]>([]);
  const [interSegmentDelayMs, setInterSegmentDelayMs] = useState<number>(2000);
  const [retryInfo, setRetryInfo] = useState<{ attempt: number; maxAttempts: number; countdown: number } | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);
  const abortRequestedRef = useRef(false);

  // Stop / Cancel Generation Handler
  const handleCancelGeneration = () => {
    abortRequestedRef.current = true;
    setIsGenerating(false);
    setIsPaused(true);
    setRetryInfo(null);
    setGenerationStep('Génération mise en pause. Vos segments déjà synthétisés sont conservés.');
  };

  // Main Generation Handler supporting Resume and controlled asynchronous queue
  const handleGenerate = async (isResume = false) => {
    if (!scriptText.trim()) {
      setErrorNotice('Veuillez renseigner un texte à synthétiser.');
      return;
    }

    if (isGenerating) return; // Prevent duplicate generation jobs

    abortRequestedRef.current = false;
    setIsGenerating(true);
    setIsPaused(false);
    setErrorNotice(null);
    setRetryInfo(null);

    try {
      const isCustomVoice = voiceCategory === 'custom';
      const customProfile = isCustomVoice
        ? customVoices.find((v) => v.id === selectedVoiceId)
        : null;
      const activeVoice = customProfile ? customProfile.baseVoice || 'Kore' : selectedVoiceId;
      const enrichedStyle = customProfile
        ? `${customProfile.stylePrompt}. ${customStyle}`.trim()
        : customStyle;

      // 1. Prepare segments queue
      let currentSegments = [...segments];

      if (!isResume || currentSegments.length === 0) {
        setGenerationStep('Découpage intelligent du script...');
        setGenerationProgress(3);

        let segmentsText: string[] = [];
        try {
          const splitRes = await splitScriptSegments(scriptText, 75);
          segmentsText = splitRes.segments;
        } catch {
          segmentsText = scriptText
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean);
          if (segmentsText.length === 0) segmentsText = [scriptText.trim()];
        }

        currentSegments = segmentsText.map((text, idx) => ({
          index: idx + 1,
          text,
          status: 'pending',
          retries: 0,
        }));
        setSegments(currentSegments);
      }

      const totalSegments = currentSegments.length;
      const startIndex = isResume
        ? currentSegments.findIndex((s) => s.status !== 'completed')
        : 0;

      if (startIndex === -1 && currentSegments.length > 0) {
        // All segments already completed!
        setGenerationStep('Tous les segments sont déjà prêts. Assemblage...');
      }

      // 2. Controlled asynchronous queue (concurrency = 1)
      for (let i = Math.max(0, startIndex); i < totalSegments; i++) {
        // Check for cancellation
        if (abortRequestedRef.current) {
          setIsGenerating(false);
          setIsPaused(true);
          setGenerationStep(`Génération suspendue au segment ${i + 1}/${totalSegments}. Vos segments sont sauvegardés.`);
          return;
        }

        const currentSeg = currentSegments[i];
        if (currentSeg.status === 'completed' && currentSeg.audioBase64) {
          continue; // Keep already completed segment
        }

        // Update progress UI
        const progressPct = Math.round(((i) / totalSegments) * 85) + 5;
        setGenerationProgress(progressPct);
        setGenerationStep(`Synthèse du segment ${i + 1} sur ${totalSegments}...`);

        const remainingCount = totalSegments - i;
        const estSecsLeft = Math.round((remainingCount * (interSegmentDelayMs / 1000 + 3)));
        setEstimatedTimeRemaining(formatEstimatedTime(estSecsLeft));

        // Mark segment as generating
        currentSegments[i] = { ...currentSegments[i], status: 'generating', error: undefined };
        setSegments([...currentSegments]);

        // Exponential backoff retry loop (max 5 attempts for transient errors)
        const maxAttempts = 5;
        let attempt = 0;
        let segmentDone = false;
        let lastError: any = null;

        while (attempt < maxAttempts && !segmentDone) {
          if (abortRequestedRef.current) break;
          attempt++;

          try {
            const segResult = await generateSingleSegment({
              text: currentSeg.text,
              voiceName: activeVoice,
              style: enrichedStyle,
              speed: speechSpeed,
              pitch: voicePitch,
            });

            if (!segResult.audioBase64) {
              throw new Error('Aucune trame audio reçue du moteur vocal.');
            }

            // Success on this segment
            currentSegments[i] = {
              ...currentSegments[i],
              status: 'completed',
              audioBase64: segResult.audioBase64,
              duration: segResult.duration,
              byteSize: segResult.byteSize,
              error: undefined,
              retries: attempt - 1,
            };
            setSegments([...currentSegments]);
            segmentDone = true;
            setRetryInfo(null);
          } catch (err: any) {
            lastError = err;
            const errMsg = err?.message || String(err);

            // Permanent errors: do not retry indefinitely
            const isInvalidKey =
              errMsg.includes('clé API') ||
              errMsg.includes('API_KEY_INVALID') ||
              errMsg.includes('401') ||
              errMsg.includes('403') ||
              err?.errorType === 'AUTH_ERROR';
            const isQuotaExhausted =
              errMsg.includes('Quota de requêtes') ||
              errMsg.includes('RESOURCE_EXHAUSTED') ||
              err?.errorType === 'DAILY_QUOTA_429';

            if (isInvalidKey || isQuotaExhausted) {
              currentSegments[i] = {
                ...currentSegments[i],
                status: 'failed',
                error: errMsg,
              };
              setSegments([...currentSegments]);
              setIsGenerating(false);
              setIsPaused(true);
              setRetryInfo(null);
              setErrorNotice(errMsg);

              // Persist current job progress so far
              try {
                localStorage.setItem(
                  'marius_active_tts_job',
                  JSON.stringify({
                    projectName,
                    scriptText,
                    voiceName: activeVoice,
                    segments: currentSegments,
                    isCompleted: false,
                    updatedAt: new Date().toISOString(),
                  })
                );
              } catch {}
              return;
            }

            // Transient error (503 high demand or 429 rate limit): apply backoff with jitter or Retry-After
            if (attempt < maxAttempts && !abortRequestedRef.current) {
              const baseBackoff = Math.round(1500 * Math.pow(1.6, attempt - 1));
              const jitter = Math.floor(Math.random() * 600);
              const retryAfter = err?.retryAfterSeconds;
              const waitDuration = retryAfter ? retryAfter * 1000 : baseBackoff + jitter;

              const countdownSecs = Math.ceil(waitDuration / 1000);
              for (let c = countdownSecs; c > 0; c--) {
                if (abortRequestedRef.current) break;
                setRetryInfo({ attempt: attempt + 1, maxAttempts, countdown: c });
                setGenerationStep(
                  retryAfter
                    ? `Délai Google Retry-After. Nouvel essai dans ${c}s (tentative ${attempt + 1}/${maxAttempts})...`
                    : `Forte demande serveur (503/429). Nouvel essai dans ${c}s (tentative ${attempt + 1}/${maxAttempts})...`
                );
                await new Promise((r) => setTimeout(r, 1000));
              }
              setRetryInfo(null);
            }
          }
        }

        if (abortRequestedRef.current) {
          setIsGenerating(false);
          setIsPaused(true);
          return;
        }

        if (!segmentDone) {
          currentSegments[i] = {
            ...currentSegments[i],
            status: 'failed',
            error: lastError?.message || 'Échec de génération du segment après plusieurs tentatives.',
          };
          setSegments([...currentSegments]);
          setIsGenerating(false);
          setIsPaused(true);

          try {
            localStorage.setItem(
              'marius_active_tts_job',
              JSON.stringify({
                projectName,
                scriptText,
                voiceName: activeVoice,
                segments: currentSegments,
                isCompleted: false,
                updatedAt: new Date().toISOString(),
              })
            );
          } catch {}

          throw new Error(`Échec sur le segment ${i + 1}/${totalSegments} : ${lastError?.message || 'Erreur inconnue'}`);
        }

        // Safety inter-segment delay (configurable)
        if (i < totalSegments - 1 && interSegmentDelayMs > 0 && !abortRequestedRef.current) {
          setGenerationStep(`Pause de sécurité anti-blocage (${(interSegmentDelayMs / 1000).toFixed(1)}s)...`);
          await new Promise((r) => setTimeout(r, interSegmentDelayMs));
        }
      }

      // 3. Assemble and concatenate all completed segments into master WAV
      setGenerationStep('Assemblage et égalisation du fichier master WAV HD...');
      setGenerationProgress(92);

      const allB64s = currentSegments
        .filter((s) => s.status === 'completed' && Boolean(s.audioBase64))
        .map((s) => s.audioBase64 as string);

      if (allB64s.length !== totalSegments) {
        throw new Error(`Impossible d'assembler : seulement ${allB64s.length}/${totalSegments} segments sont terminés.`);
      }

      const concatRes = await concatenateAudioSegments({
        segmentBase64s: allB64s,
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
        setGeneratedSegments(currentSegments);

        onGenerationComplete({
          creationId: concatRes.creationId,
          text: scriptText,
          voiceName: activeVoice,
          duration: concatRes.duration,
        });

        setGenerationProgress(100);
        setGenerationStep('Génération terminée avec succès !');
        setIsPaused(false);
        try {
          localStorage.removeItem('marius_active_tts_job');
        } catch {}
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      let msg = err.message || 'Une erreur est survenue pendant la génération vocale.';
      setErrorNotice(msg);
      setIsPaused(true);
    } finally {
      setIsGenerating(false);
      setRetryInfo(null);
    }
  };

  // Dedicated single-segment retry handler
  const handleRetrySingleSegment = async (segIndex: number) => {
    const segIdx = segments.findIndex((s) => s.index === segIndex);
    if (segIdx === -1) return;

    const targetSeg = segments[segIdx];
    const isCustomVoice = voiceCategory === 'custom';
    const customProfile = isCustomVoice ? customVoices.find((v) => v.id === selectedVoiceId) : null;
    const activeVoice = customProfile ? customProfile.baseVoice || 'Kore' : selectedVoiceId;
    const enrichedStyle = customProfile ? `${customProfile.stylePrompt}. ${customStyle}`.trim() : customStyle;

    const updated = [...segments];
    updated[segIdx] = { ...targetSeg, status: 'generating', error: undefined };
    setSegments(updated);
    setErrorNotice(null);

    try {
      const res = await generateSingleSegment({
        text: targetSeg.text,
        voiceName: activeVoice,
        style: enrichedStyle,
        speed: speechSpeed,
        pitch: voicePitch,
      });

      if (res.audioBase64) {
        updated[segIdx] = {
          ...targetSeg,
          status: 'completed',
          audioBase64: res.audioBase64,
          duration: res.duration,
          byteSize: res.byteSize,
          error: undefined,
        };
        setSegments(updated);

        // If all segments are now completed, offer to concatenate
        if (updated.every((s) => s.status === 'completed' && s.audioBase64)) {
          const allB64s = updated.map((s) => s.audioBase64 as string);
          const concatRes = await concatenateAudioSegments({
            segmentBase64s: allB64s,
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
            setGeneratedSegments(updated);
            onGenerationComplete({
              creationId: concatRes.creationId,
              text: scriptText,
              voiceName: activeVoice,
              duration: concatRes.duration,
            });
            try {
              localStorage.removeItem('marius_active_tts_job');
            } catch {}
          }
        }
      }
    } catch (err: any) {
      console.error('Segment retry error:', err);
      updated[segIdx] = {
        ...targetSeg,
        status: 'failed',
        error: err.message || 'Échec lors de la réévaluation de ce segment.',
      };
      setSegments(updated);
      setErrorNotice(err.message || 'Échec lors du réessai du segment.');
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

      {/* SECTION 5: Generation Action Bar & Controlled Asynchronous Queue */}
      <div className="space-y-4">
        {/* Personal API Key Missing Advisory Banner */}
        {!apiKeyManager.hasKey() && (
          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Clé API Google non enregistrée :</strong> Il est fortement conseillé de renseigner votre clé personnelle pour éviter les limitations de requêtes partagées.
              </span>
            </div>
            {onNavigateToApiKey && (
              <button
                type="button"
                onClick={onNavigateToApiKey}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shrink-0 cursor-pointer"
              >
                Configurer ma clé →
              </button>
            )}
          </div>
        )}

        {/* Safety Delay & Rate Limit Guard Setting */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0b0d18] border border-white/5 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-gray-300 font-medium">Délai de sécurité anti-blocage entre segments :</span>
            <span className="font-mono text-purple-300 font-bold">{(interSegmentDelayMs / 1000).toFixed(1)}s</span>
          </div>

          <div className="flex items-center gap-1.5">
            {[1000, 2000, 3000, 5000].map((ms) => (
              <button
                key={ms}
                type="button"
                onClick={() => setInterSegmentDelayMs(ms)}
                disabled={isGenerating}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  interSegmentDelayMs === ms
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {ms / 1000}s
              </button>
            ))}
          </div>
        </div>

        {errorNotice && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-xs sm:text-sm text-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block mb-0.5 font-semibold">Incident de synthèse :</strong>
              <p className="leading-relaxed">{errorNotice}</p>
              {segments.some((s) => s.status === 'completed') && (
                <p className="text-emerald-300 text-xs mt-2 font-medium">
                  ✓ Vos {segments.filter((s) => s.status === 'completed').length} segment(s) déjà réussis sont conservés en mémoire. Vous pouvez reprendre la génération sans tout recommencer.
                </p>
              )}
            </div>
            {onNavigateToQuotas && (errorNotice.includes('Quota') || errorNotice.includes('429')) && (
              <button
                onClick={onNavigateToQuotas}
                className="px-3 py-1.5 rounded-lg bg-red-800/80 hover:bg-red-700 text-white font-semibold text-xs shrink-0 cursor-pointer"
              >
                Voir mes quotas
              </button>
            )}
          </div>
        )}

        {/* Retry Banner with Countdown on 503 / 429 */}
        {retryInfo && (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
              <span>
                Forte demande Google AI Studio détectée. <strong>Nouvelle tentative automatique dans {retryInfo.countdown}s</strong> (Tentative {retryInfo.attempt}/{retryInfo.maxAttempts})
              </span>
            </div>
            <button
              onClick={handleCancelGeneration}
              className="text-xs text-amber-300 hover:text-white underline cursor-pointer"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Big Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-950/50 via-[#101322] to-indigo-950/50 border border-purple-500/30 shadow-2xl">
          <div className="hidden sm:block">
            <p className="text-xs text-gray-400">
              Voix : <strong className="text-white">{selectedVoiceId}</strong> • Débit :{' '}
              <strong className="text-white">{speechSpeed}x</strong>
              {segments.length > 0 && (
                <span className="ml-2 text-purple-300">
                  • {segments.filter((s) => s.status === 'completed').length}/{segments.length} segments prêts
                </span>
              )}
            </p>
            <p className="text-[11px] text-purple-300">
              Rendu master WAV HD 24kHz avec concaténation sans rupture
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* If currently generating: Show Cancel / Pause Button */}
            {isGenerating ? (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 text-red-200 text-sm font-bold transition-all cursor-pointer shadow-lg"
              >
                <Pause className="w-4 h-4 text-red-400" />
                <span>Mettre en pause / Annuler</span>
              </button>
            ) : isPaused && segments.some((s) => s.status !== 'completed') ? (
              /* If paused/interrupted with unfinished segments: Show Resume Button */
              <>
                <button
                  type="button"
                  onClick={() => handleGenerate(true)}
                  disabled={!scriptText.trim()}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-xl shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>
                    Reprendre la synthèse ({segments.filter((s) => s.status !== 'completed').length} segments restants)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSegments([]);
                    handleGenerate(false);
                  }}
                  className="px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold cursor-pointer"
                  title="Recommencer tout le texte depuis le début"
                >
                  Recommencer à zéro
                </button>
              </>
            ) : (
              /* Standard Full Generate Button */
              <button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={isGenerating || !scriptText.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-400 hover:from-purple-500 hover:to-cyan-300 text-white text-base font-extrabold shadow-2xl shadow-purple-900/50 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Volume2 className="w-5 h-5" />
                <span>Générer la Voix Audio (~{formatEstimatedTime(estimatedSeconds)})</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Segment Progress & Pipeline Visualizer */}
        {(isGenerating || segments.length > 0) && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0e111d] border border-purple-500/30 space-y-3 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-gray-300">
                <span className="font-semibold text-white">{generationStep}</span>
                {estimatedTimeRemaining && isGenerating && (
                  <span className="text-gray-400 text-[11px] hidden sm:inline">
                    (Temps estimé : {estimatedTimeRemaining})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-purple-300">
                  {segments.filter((s) => s.status === 'completed').length} / {segments.length} segments
                </span>
                <span className="text-purple-400 font-bold">{generationProgress}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-gray-800/80 rounded-full overflow-hidden p-[1px]">
              <div
                style={{ width: `${generationProgress}%` }}
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 transition-all duration-300 rounded-full"
              />
            </div>

            {/* Segment Chips Matrix */}
            <div className="pt-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mb-2">
                File d'attente asynchrone des segments :
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {segments.map((seg) => (
                  <div
                    key={seg.index}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 border transition-all ${
                      seg.status === 'completed'
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : seg.status === 'generating'
                        ? 'bg-purple-950/80 border-purple-400 text-purple-200 animate-pulse ring-1 ring-purple-400'
                        : seg.status === 'failed'
                        ? 'bg-red-950/60 border-red-500/40 text-red-300'
                        : 'bg-white/5 border-white/5 text-gray-500'
                    }`}
                    title={seg.text}
                  >
                    <span>#{seg.index}</span>
                    {seg.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {seg.status === 'generating' && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />}
                    {seg.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-400" />}
                    {seg.duration && (
                      <span className="opacity-80">({seg.duration.toFixed(1)}s)</span>
                    )}
                    {seg.status === 'failed' && !isGenerating && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetrySingleSegment(seg.index);
                        }}
                        className="ml-1 px-1.5 py-0.5 rounded bg-red-800/80 hover:bg-red-700 text-white text-[9px] font-sans font-bold cursor-pointer transition-colors"
                        title="Réessayer ce segment individuellement"
                      >
                        Réessayer
                      </button>
                    )}
                  </div>
                ))}
              </div>
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
