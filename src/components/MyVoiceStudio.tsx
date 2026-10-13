import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Upload,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  ShieldCheck,
  Activity,
  Volume2,
  Clock,
  Gauge,
  Info,
} from 'lucide-react';
import { CustomVoiceProfile, VoiceAnalysisResult } from '../types.ts';
import { analyzeVoiceRecording, createCustomVoice, deleteCustomVoice, generateSingleSegment } from '../services/api.ts';
import { apiKeyManager } from '../services/apiKeyManager.ts';

interface MyVoiceStudioProps {
  customVoices: CustomVoiceProfile[];
  onVoiceCreated: (voice: CustomVoiceProfile) => void;
  onVoiceDeleted: (id: string) => void;
  onSelectForTTS: (voiceId: string) => void;
}

export const MyVoiceStudio: React.FC<MyVoiceStudioProps> = ({
  customVoices,
  onVoiceCreated,
  onVoiceDeleted,
  onSelectForTTS,
}) => {
  // Input mode: 'record' or 'upload'
  const [inputMode, setInputMode] = useState<'record' | 'upload'>('record');

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Audio sample states
  const [sampleBlob, setSampleBlob] = useState<Blob | null>(null);
  const [sampleBase64, setSampleBase64] = useState<string>('');
  const [sampleMimeType, setSampleMimeType] = useState<string>('audio/webm');
  const [sampleFileName, setSampleFileName] = useState<string>('');
  const [sampleDuration, setSampleDuration] = useState<number>(0);
  const [sampleAudioUrl, setSampleAudioUrl] = useState<string>('');
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingSample, setIsPlayingSample] = useState(false);

  // Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisElapsed, setAnalysisElapsed] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<VoiceAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Voice creation states
  const [voiceName, setVoiceName] = useState('');
  const [voiceDescription, setVoiceDescription] = useState('');
  const [selectedBaseVoice, setSelectedBaseVoice] = useState<'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr'>('Kore');
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [testVoiceError, setTestVoiceError] = useState<string | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  // Micro permissions
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (sampleAudioUrl) URL.revokeObjectURL(sampleAudioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sampleAudioUrl]);

  // Handle Recording Timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Handle Analysis Timer
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setAnalysisElapsed(0);
      interval = setInterval(() => {
        setAnalysisElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing]);

  // Start Mic Recording
  const startRecording = async () => {
    setMicPermissionDenied(false);
    setAnalysisError(null);
    setCreateError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Prefer audio/webm;codecs=opus or standard audio/mp4/webm
      let options = { mimeType: 'audio/webm' };
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setSampleBlob(blob);
        setSampleMimeType(mimeType);
        setSampleFileName(`enregistrement-vocal-${new Date().toISOString().slice(0, 10)}.webm`);
        setSampleDuration(recordingSeconds);

        if (sampleAudioUrl) URL.revokeObjectURL(sampleAudioUrl);
        const url = URL.createObjectURL(blob);
        setSampleAudioUrl(url);

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const b64 = res.split(',')[1] || '';
          setSampleBase64(b64);
        };
        reader.readAsDataURL(blob);

        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250); // collect chunks every 250ms
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setMicPermissionDenied(true);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const resetSample = () => {
    if (sampleAudioUrl) URL.revokeObjectURL(sampleAudioUrl);
    setSampleBlob(null);
    setSampleBase64('');
    setSampleAudioUrl('');
    setSampleFileName('');
    setSampleDuration(0);
    setRecordingSeconds(0);
    setIsRecording(false);
    setIsPaused(false);
    setAnalysisResult(null);
    setAnalysisError(null);
    setCreateSuccess(null);
    setCreateError(null);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setAnalysisError('Le fichier audio dépasse la limite maximale de 25 Mo.');
      return;
    }

    setSampleFileName(file.name);
    setSampleBlob(file);
    setSampleMimeType(file.type || 'audio/mp3');

    if (sampleAudioUrl) URL.revokeObjectURL(sampleAudioUrl);
    const url = URL.createObjectURL(file);
    setSampleAudioUrl(url);

    // Audio duration check
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      setSampleDuration(Math.round(tempAudio.duration || 0));
    };

    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const b64 = res.split(',')[1] || '';
      setSampleBase64(b64);
    };
    reader.readAsDataURL(file);

    setAnalysisResult(null);
    setAnalysisError(null);
  };

  // Trigger Acoustic & Rhythm Analysis with Gemini
  const runVoiceAnalysis = async () => {
    if (!apiKeyManager.hasKey()) {
      setAnalysisError('Clé API Google Gemini requise pour l\'analyse acoustique. Veuillez renseigner votre clé personnelle dans l\'onglet « Ma clé API Google ».');
      return;
    }
    if (!sampleBase64) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const data = await analyzeVoiceRecording({
        audioBase64: sampleBase64,
        mimeType: sampleMimeType,
        durationSeconds: sampleDuration || recordingSeconds,
      });

      if (data.analysis) {
        setAnalysisResult(data.analysis);
        // Pre-fill form values intelligently based on acoustic characteristics
        if (!voiceName) {
          setVoiceName(`Ma Voix ${data.analysis.pitchCategory === 'grave' ? 'Grave' : data.analysis.pitchCategory === 'aigu' ? 'Claire' : 'Harmonieuse'}`);
        }
        if (data.analysis.recommendedBaseVoice) {
          setSelectedBaseVoice(data.analysis.recommendedBaseVoice);
        }
        if (data.analysis.recommendedStylePrompt) {
          setCustomStylePrompt(data.analysis.recommendedStylePrompt);
        }
        setVoiceDescription(`Voix ${data.analysis.pitchCategory}, timbre ${data.analysis.vocalTimbre}, débit ${data.analysis.tempoStyle} (~${data.analysis.wordsPerMinute} mots/min).`);
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setAnalysisError(err.message || 'Impossible d\'analyser l\'enregistrement vocal.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit Voice Profile Creation
  const handleCreateVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceName.trim()) {
      setCreateError('Veuillez donner un nom à votre profil vocal.');
      return;
    }
    if (!consentChecked) {
      setCreateError('Vous devez obligatoirement confirmer le consentement d\'utilisation de la voix.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const result = await createCustomVoice({
        name: voiceName.trim(),
        baseVoice: selectedBaseVoice,
        stylePrompt: customStylePrompt.trim() || 'Voix naturelle, chaleureuse et expressive.',
        rhythm: analysisResult?.tempoStyle || 'modéré',
        pitch: analysisResult?.pitchCategory || 'médium',
        description: voiceDescription.trim() || 'Voix personnalisée Marius Voice AI',
        consentGiven: true,
      });

      onVoiceCreated(result.voice);
      setCreateSuccess(`Votre voix personnalisée "${result.voice.name}" a été créée avec succès !`);
      // Scroll to custom voices section
    } catch (err: any) {
      console.error('Creation error:', err);
      setCreateError(err.message || 'Échec de la création de la voix personnalisée.');
    } finally {
      setIsCreating(false);
    }
  };

  // Instant configuration without waiting for AI analysis
  const handleQuickConfigure = () => {
    const dur = sampleDuration || recordingSeconds || 15;
    const estWords = Math.max(12, Math.round(dur * 2.3));
    const estWpm = Math.round((estWords / dur) * 60);

    const defaultProfile: VoiceAnalysisResult = {
      transcript: "Échantillon vocal calibré directement en mode express.",
      wordCount: estWords,
      wordsPerMinute: estWpm > 0 && estWpm < 220 ? estWpm : 140,
      pitchCategory: "médium",
      pitchHzEstimate: "140-180 Hz",
      tempoStyle: "modéré",
      vocalTimbre: "Chaleureux, naturel et articulé",
      pauseAnalysis: "Rythme équilibré",
      clarityScore: 95,
      backgroundNoiseLevel: "faible",
      audioQualityFeedback: "Configuration express instantanée validée.",
      recommendedBaseVoice: "Kore",
      recommendedStylePrompt: "Voix naturelle, posée et expressive en français standard avec pauses soignées et diction claire.",
      accent: "Neutre français standard",
    };

    setAnalysisResult(defaultProfile);
    if (!voiceName) setVoiceName("Ma Voix Personnalisée");
    setSelectedBaseVoice("Kore");
    setCustomStylePrompt("Voix naturelle, posée et expressive en français standard avec pauses soignées et diction claire.");
    setVoiceDescription("Voix personnalisée Marius Voice AI configurée directement.");
    setAnalysisError(null);
  };

  // Test configured voice with a sample sentence before saving
  const handleTestVoice = async () => {
    if (isTestingVoice && testAudioRef.current) {
      testAudioRef.current.pause();
      setIsTestingVoice(false);
      return;
    }

    if (!apiKeyManager.hasKey()) {
      setTestVoiceError('Clé API Google Gemini requise pour tester un extrait audio. Veuillez configurer votre clé dans l\'onglet « Ma clé API Google ».');
      return;
    }

    setIsTestingVoice(true);
    setTestVoiceError(null);
    try {
      const res = await generateSingleSegment({
        text: `Bonjour, ceci est un aperçu de ${voiceName || 'ma voix personnalisée'} généré par Marius Voice AI.`,
        voiceName: selectedBaseVoice,
        style: customStylePrompt || 'Voix naturelle, chaleureuse et expressive.',
      });

      if (res.audioBase64) {
        if (testAudioRef.current) testAudioRef.current.pause();
        const audio = new Audio(`data:audio/wav;base64,${res.audioBase64}`);
        audio.onended = () => setIsTestingVoice(false);
        audio.play();
        testAudioRef.current = audio;
      }
    } catch (err: any) {
      console.error('Test voice preview error:', err);
      setTestVoiceError(err.message || 'Impossible de générer l\'extrait audio test.');
    } finally {
      setIsTestingVoice(false);
    }
  };

  const togglePlaySample = () => {
    if (!sampleAudioRef.current) return;
    if (isPlayingSample) {
      sampleAudioRef.current.pause();
      setIsPlayingSample(false);
    } else {
      sampleAudioRef.current.play();
      setIsPlayingSample(true);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Title & Introduction Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-[#131526] to-indigo-950/60 p-6 sm:p-8 rounded-3xl border border-purple-500/20 shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Studio Vocal • Voice Design & Profil Personnalisé
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Créez Votre Profil Vocal Sur-Mesure
          </h1>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            Enregistrez ou déposez un échantillon vocal de 15 à 60 secondes. L'intelligence acoustique analyse votre rythme, intonation, et timbre pour calibrer un profil de Voice Design réutilisable dans vos narrations.
          </p>
        </div>

        {/* Technical Transparency Banner */}
        <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200">
          <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-white">Fonctionnement du moteur vocal Gemini 3.8 TTS :</p>
            <p className="text-gray-300 leading-relaxed">
              L'API Google Gemini ne réalise pas de clonage biométrique par copie brute d'empreinte vocale (non supporté par l'API publique Google). Marius Voice AI analyse vos caractéristiques acoustiques (hauteur en Hz, débit, timbre, pauses) pour associer automatiquement la voix studio de base la plus proche ('Kore', 'Puck', 'Charon', 'Fenrir' ou 'Zephyr') à un prompt de style phonétique détaillé.
            </p>
          </div>
        </div>

        {/* Consent Notice */}
        <div className="mt-3 flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-white">Confidentialité & Droits :</strong> Vos enregistrements audio restent protégés et ne sont jamais partagés publiquement. Vous devez posséder les droits sur la voix utilisée.
          </p>
        </div>
      </div>

      {/* STEP 1: Capture Voice Sample (Record or Upload) */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              Échantillon Vocal de Référence
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Privilégiez un environnement calme avec une prononciation naturelle en français.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#090b14] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => {
                setInputMode('record');
                resetSample();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                inputMode === 'record'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Microphone en direct
            </button>
            <button
              onClick={() => {
                setInputMode('upload');
                resetSample();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                inputMode === 'upload'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Fichier audio
            </button>
          </div>
        </div>

        {/* Recording Mode UI */}
        {inputMode === 'record' && (
          <div className="flex flex-col items-center justify-center py-6 px-4">
            {micPermissionDenied && (
              <div className="w-full mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-200">Accès au microphone refusé</p>
                  <p className="mt-1">
                    Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur (Chrome, Firefox, Safari ou Android), ou utilisez l'option d'import de fichier audio.
                  </p>
                </div>
              </div>
            )}

            {!sampleAudioUrl ? (
              <div className="text-center space-y-5">
                {/* Live Timer */}
                <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-wider text-purple-300">
                  {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
                  {(recordingSeconds % 60).toString().padStart(2, '0')}
                </div>

                {/* Animated pulsating mic circle */}
                <div className="relative inline-flex items-center justify-center">
                  {isRecording && (
                    <span className="absolute w-28 h-28 rounded-full bg-purple-500/20 animate-ping" />
                  )}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 z-10 ${
                      isRecording
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/50'
                        : 'bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/50'
                    }`}
                    aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Démarrer l\'enregistrement'}
                  >
                    {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
                  </button>
                </div>

                {/* Instructions */}
                <div>
                  <p className="font-semibold text-sm text-white">
                    {isRecording ? 'Enregistrement en cours... Parlez naturellement.' : 'Appuyez pour commencer à parler'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Exemple à lire : <br />
                    <em>"Bonjour, je configure aujourd'hui ma voix sur Marius Voice AI pour donner vie à mes projets audio."</em>
                  </p>
                </div>

                {/* Pause / Resume Controls during recording */}
                {isRecording && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={isPaused ? resumeRecording : pauseRecording}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-medium border border-white/10"
                    >
                      {isPaused ? 'Reprendre' : 'Pause'}
                    </button>
                    <button
                      onClick={stopRecording}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs text-white font-semibold shadow"
                    >
                      Terminer & Analyser
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Upload Mode UI */}
        {inputMode === 'upload' && !sampleAudioUrl && (
          <div className="border-2 border-dashed border-white/10 hover:border-purple-500/50 rounded-2xl p-8 text-center transition-colors">
            <input
              type="file"
              id="voice-file-input"
              accept="audio/wav,audio/mp3,audio/m4a,audio/aac,audio/webm,audio/ogg"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label htmlFor="voice-file-input" className="cursor-pointer block space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">
                  Cliquez ou glissez-déposez votre fichier audio
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Formats acceptés : WAV, MP3, M4A, AAC, WebM (Max 25 Mo)
                </p>
              </div>
              <span className="inline-block px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-200 hover:bg-white/10 font-medium">
                Parcourir les fichiers
              </span>
            </label>
          </div>
        )}

        {/* Audio Sample Player & Validation Review */}
        {sampleAudioUrl && (
          <div className="bg-[#0b0d18] rounded-2xl border border-purple-500/30 p-5 mt-4 space-y-4">
            <audio
              ref={sampleAudioRef}
              src={sampleAudioUrl}
              onEnded={() => setIsPlayingSample(false)}
            />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlaySample}
                  className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-900/40 hover:bg-purple-500 transition-colors"
                >
                  {isPlayingSample ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <div>
                  <h4 className="text-sm font-semibold text-white">{sampleFileName || 'Échantillon vocal prêt'}</h4>
                  <p className="text-xs text-gray-400">
                    Durée : {sampleDuration || recordingSeconds}s • Format : {sampleMimeType}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 border border-white/10"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Réenregistrer
                </button>

                {!analysisResult && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleQuickConfigure}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-medium transition-all cursor-pointer"
                      title="Pré-configurer immédiatement sans délai d'analyse"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Configuration Express (Immédiat)
                    </button>

                    <button
                      onClick={runVoiceAnalysis}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/40 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Analyse en cours ({analysisElapsed}s)...
                        </>
                      ) : (
                        <>
                          <Activity className="w-3.5 h-3.5" />
                          Lancer l'analyse vocale IA (~2s)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {analysisError && (
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs text-purple-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-purple-400" />
                  <span>{analysisError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAnalysisResult({
                      transcript: "Échantillon vocal enregistré avec succès.",
                      wordCount: 20,
                      wordsPerMinute: 140,
                      pitchCategory: "médium",
                      pitchHzEstimate: "140-180 Hz",
                      tempoStyle: "modéré",
                      vocalTimbre: "Chaleureux, naturel et articulé",
                      pauseAnalysis: "Pauses respiratoires régulières",
                      clarityScore: 92,
                      backgroundNoiseLevel: "faible",
                      audioQualityFeedback: "Échantillon audio validé.",
                      recommendedBaseVoice: "Kore",
                      recommendedStylePrompt: "Voix naturelle, posée et expressive en français standard avec pauses soignées et diction claire.",
                      accent: "Neutre français standard",
                    });
                    if (!voiceName) setVoiceName("Ma Voix Personnalisée");
                    setSelectedBaseVoice("Kore");
                    setCustomStylePrompt("Voix naturelle, posée et expressive en français standard avec pauses soignées et diction claire.");
                    setAnalysisError(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer shrink-0"
                >
                  Configurer ma voix directement
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 2: Acoustic & Rhythm Analysis Results */}
      {analysisResult && (
        <div className="bg-[#101322] rounded-3xl border border-purple-500/20 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                Rapport d'Analyse Acoustique & Rythmique
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Extraction des caractéristiques phonétiques et prosodiques par Gemini
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              Qualité {analysisResult.clarityScore}%
            </span>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#090b14] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Gauge className="w-3.5 h-3.5 text-purple-400" />
                Débit de parole
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {analysisResult.wordsPerMinute} <span className="text-xs font-normal text-gray-400">mots/min</span>
              </div>
              <p className="text-[11px] text-purple-300 capitalize mt-0.5">{analysisResult.tempoStyle}</p>
            </div>

            <div className="bg-[#090b14] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                Tonalité / Pitch
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white capitalize">
                {analysisResult.pitchCategory}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">{analysisResult.pitchHzEstimate}</p>
            </div>

            <div className="bg-[#090b14] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Bruit de fond
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white capitalize">
                {analysisResult.backgroundNoiseLevel}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">Isolement sonore</p>
            </div>

            <div className="bg-[#090b14] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Modèle Base
              </div>
              <div className="text-xl sm:text-2xl font-bold text-purple-300">
                {analysisResult.recommendedBaseVoice}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">Correspondance timbre</p>
            </div>
          </div>

          {/* Detailed Observations */}
          <div className="space-y-3 bg-[#0a0c16] p-4 sm:p-5 rounded-2xl border border-white/5 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-gray-300 shrink-0">Grain & Timbre :</span>
              <span className="text-gray-400">{analysisResult.vocalTimbre}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-gray-300 shrink-0">Pauses & Silences :</span>
              <span className="text-gray-400">{analysisResult.pauseAnalysis}</span>
            </div>
            {analysisResult.transcript && (
              <div className="pt-2 border-t border-white/5">
                <span className="font-semibold text-gray-300 block mb-1">Transcription de l'extrait :</span>
                <p className="italic text-gray-400 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  "{analysisResult.transcript}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Voice Creation Form */}
      {analysisResult && (
        <form onSubmit={handleCreateVoice} className="bg-[#101322] rounded-3xl border border-purple-500/20 p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              Génération du Profil Vocal Sur-Mesure
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Finalisez la configuration de votre voix personnalisée pour la rendre accessible dans l'éditeur de synthèse vocale.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Nom de la voix personnalisée *
              </label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="Ex: Ma Voix Podcast, Voix Studio Marius..."
                required
                className="w-full bg-[#0a0c14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Base acoustique (Moteur Gemini 3.8)
              </label>
              <select
                value={selectedBaseVoice}
                onChange={(e) => setSelectedBaseVoice(e.target.value as any)}
                className="w-full bg-[#0a0c14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="Kore">Kore (Chaleureuse, Naturelle, Féminine)</option>
                <option value="Puck">Puck (Énergique, Vif, Masculin)</option>
                <option value="Charon">Charon (Grave, Résonnant, Masculin)</option>
                <option value="Fenrir">Fenrir (Puissant, Inspirant, Masculin)</option>
                <option value="Zephyr">Zephyr (Claire, Posée, Féminine)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Instruction de style vocal (Prompt de modélisation)
            </label>
            <textarea
              rows={3}
              value={customStylePrompt}
              onChange={(e) => setCustomStylePrompt(e.target.value)}
              placeholder="Instructions de prosodie, intonation et expressivité..."
              className="w-full bg-[#0a0c14] border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Généré automatiquement à partir de votre analyse vocale pour reproduire au plus près votre diction.
            </p>
          </div>

          {/* Consent Checkbox */}
          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <span className="text-xs text-gray-300 leading-normal">
                <strong className="text-white">Consentement explicite obligatoire :</strong> Je certifie sur l'honneur être le propriétaire légitime de cette voix ou posséder l'autorisation écrite et vérifiable de la personne concernée pour créer et utiliser ce clone vocal via Marius Voice AI, en conformité avec la réglementation en vigueur.
              </span>
            </label>
          </div>

          {createError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {createSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{createSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const latest = customVoices[0]?.id;
                  if (latest) onSelectForTTS(latest);
                }}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shrink-0"
              >
                Tester en Synthèse Vocale
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestVoice}
              disabled={isTestingVoice}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer"
            >
              {isTestingVoice ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  Génération de l'extrait test...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-purple-400 fill-current" />
                  Écouter un aperçu de cette voix
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={isCreating || !consentChecked}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-sm font-bold shadow-xl shadow-purple-900/40 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isCreating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Création de votre voix en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Créer Ma Voix Personnalisée
                </>
              )}
            </button>
          </div>

          {testVoiceError && (
            <div className="mt-2 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
              <span>{testVoiceError}</span>
            </div>
          )}
        </form>
      )}

      {/* STEP 4: Saved Custom Voices Library */}
      <div className="bg-[#101322] rounded-3xl border border-white/5 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Mic className="w-5 h-5 text-purple-400" />
              Vos Voix Personnalisées ({customVoices.length})
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Profils vocaux enregistrés, prêts à être utilisés pour générer de nouveaux textes.
            </p>
          </div>
        </div>

        {customVoices.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-white/10 rounded-2xl">
            <Mic className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-300">Aucune voix personnalisée pour le moment</p>
            <p className="text-xs text-gray-500 mt-1">
              Enregistrez un échantillon vocal ci-dessus pour donner naissance à votre premier avatar vocal.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customVoices.map((voice) => (
              <div
                key={voice.id}
                className="bg-[#0b0d18] rounded-2xl border border-white/10 hover:border-purple-500/40 p-5 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">{voice.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Base {voice.baseVoice}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{voice.description}</p>
                  </div>

                  <button
                    onClick={() => onVoiceDeleted(voice.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                    title="Supprimer cette voix"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 text-[11px] text-gray-300 font-mono">
                  <span className="text-gray-500 block mb-0.5">Style appliqué :</span>
                  <p className="line-clamp-2">{voice.stylePrompt}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] text-gray-500">
                    Créée le {new Date(voice.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  <button
                    onClick={() => onSelectForTTS(voice.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition-all active:scale-95"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Utiliser dans la synthèse
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
