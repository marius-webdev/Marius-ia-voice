import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  ListMusic,
  Check,
  Sparkles,
  FileAudio,
  ChevronDown,
  Music,
} from 'lucide-react';
import { GenerationSegment } from '../types.ts';
import { exportAudio } from '../services/api.ts';

interface AdvancedAudioPlayerProps {
  wavBase64?: string;
  mp3Base64?: string;
  projectName?: string;
  duration?: number;
  segments?: GenerationSegment[];
  onSegmentRetry?: (index: number) => void;
}

export const AdvancedAudioPlayer: React.FC<AdvancedAudioPlayerProps> = ({
  wavBase64,
  mp3Base64,
  projectName = 'Voiceover',
  duration = 0,
  segments = [],
  onSegmentRetry,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [showSegments, setShowSegments] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Format dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Audio source URL
  const audioSrc = React.useMemo(() => {
    if (wavBase64) {
      return `data:audio/wav;base64,${wavBase64}`;
    }
    if (mp3Base64) {
      return `data:audio/mp3;base64,${mp3Base64}`;
    }
    return '';
  }, [wavBase64, mp3Base64]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (duration > 0) {
      setTotalDuration(duration);
    }
  }, [duration]);

  const togglePlay = () => {
    if (!audioRef.current || !audioSrc) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.error('Audio playback error:', err));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!totalDuration && audioRef.current.duration) {
        setTotalDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setTotalDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const jump = (deltaSeconds: number) => {
    if (audioRef.current) {
      const nextTime = Math.max(0, Math.min(audioRef.current.currentTime + deltaSeconds, totalDuration));
      seek(nextTime);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleExportFormat = async (targetFormat: 'mp3' | 'wav' | 'ogg') => {
    setShowExportMenu(false);
    setIsExporting(targetFormat);

    try {
      let exportBase64 = '';
      let mime = 'audio/wav';

      if (targetFormat === 'wav' && wavBase64) {
        exportBase64 = wavBase64;
        mime = 'audio/wav';
      } else {
        const result = await exportAudio({
          wavBase64: wavBase64 || mp3Base64,
          format: targetFormat,
        });
        exportBase64 = result.audioBase64;
        mime = result.mimeType;
      }

      const sanitizedTitle = projectName
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'enregistrement';

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `marius-voice-ai-${sanitizedTitle}-${dateStr}.${targetFormat}`;

      const link = document.createElement('a');
      link.href = `data:${mime};base64,${exportBase64}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(targetFormat);
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(null);
    }
  };

  const playSegment = (seg: GenerationSegment) => {
    if (!seg.audioBase64) return;
    setActiveSegmentIndex(seg.index);
    if (audioRef.current) {
      audioRef.current.src = `data:audio/wav;base64,${seg.audioBase64}`;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const restoreMasterAudio = () => {
    setActiveSegmentIndex(null);
    if (audioRef.current && audioSrc) {
      audioRef.current.src = audioSrc;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const downloadSingleSegment = (seg: GenerationSegment) => {
    if (!seg.audioBase64) return;
    const link = document.createElement('a');
    link.href = `data:audio/wav;base64,${seg.audioBase64}`;
    const sanitized = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-') || 'projet';
    link.download = `marius-${sanitized}-segment-${seg.index}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllSegments = async () => {
    const readySegments = segments.filter((s) => Boolean(s.audioBase64));
    for (let i = 0; i < readySegments.length; i++) {
      downloadSingleSegment(readySegments[i]);
      await new Promise((r) => setTimeout(r, 350));
    }
  };

  if (!audioSrc) {
    return null;
  }

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="w-full bg-[#111422] rounded-2xl border border-purple-500/20 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Hidden HTML audio element */}
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Title, Active Segment indicator & Format Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">
              {activeSegmentIndex !== null ? `Aperçu du Segment #${activeSegmentIndex}` : projectName}
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {activeSegmentIndex !== null
              ? 'Lecture du segment individuel • Cliquez sur Master pour revenir au mix complet'
              : `Audio prêt pour diffusion • Durée totale : ${formatTime(totalDuration)}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSegmentIndex !== null && (
            <button
              onClick={restoreMasterAudio}
              className="text-xs px-2.5 py-1 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/30 font-medium"
            >
              Revenir au Master
            </button>
          )}
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
            24 kHz • WAV 16-bit
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300">
            MP3 / OGG Export
          </span>
        </div>
      </div>

      {/* Animated Waveform Visualizer */}
      <div className="h-14 sm:h-16 bg-[#0a0c14] rounded-xl border border-white/5 px-3 py-2 flex items-center justify-between gap-1 mb-4 relative overflow-hidden">
        {Array.from({ length: 48 }).map((_, i) => {
          const heightPercent = isPlaying
            ? Math.max(15, Math.sin(i * 0.4 + currentTime * 8) * 85 + 15)
            : Math.max(10, Math.sin(i * 0.3) * 40 + 20);
          const isPassed = (i / 48) * 100 <= progressPercent;

          return (
            <div
              key={i}
              className="flex-1 h-full flex items-center justify-center cursor-pointer"
              onClick={() => seek((i / 48) * totalDuration)}
            >
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full max-w-[4px] rounded-full transition-all duration-150 ${
                  isPassed
                    ? 'bg-gradient-to-t from-purple-500 to-indigo-400 shadow-sm shadow-purple-500/40'
                    : 'bg-white/15 hover:bg-white/30'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Scrub Bar & Timestamps */}
      <div className="space-y-1 mb-4">
        <input
          type="range"
          min={0}
          max={totalDuration || 100}
          step={0.1}
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
        />
        <div className="flex justify-between text-xs font-mono text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Playback Controls & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
        {/* Left: Play, Jump & Rate */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => jump(-5)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Reculer de 5s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-900/40 transition-transform active:scale-95 cursor-pointer"
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => jump(5)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Avancer de 5s"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Speed selector */}
          <div className="flex items-center bg-[#0d0f19] rounded-lg border border-white/5 p-0.5 ml-1">
            {[0.75, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`text-[11px] font-mono px-2 py-1 rounded transition-colors ${
                  playbackRate === rate ? 'bg-purple-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Center / Volume */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              setIsMuted(false);
            }}
            className="w-20 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Right: Segments & "Exporter au format" dropdown */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0 relative">
          {segments.length > 1 && (
            <button
              onClick={() => setShowSegments(!showSegments)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                showSegments
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              Segments ({segments.length})
            </button>
          )}

          {/* Dedicated "Exporter au format" Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={Boolean(isExporting)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white shadow-lg shadow-purple-900/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Choisir le format d'exportation (MP3, WAV ou OGG)"
            >
              {isExporting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Export {isExporting.toUpperCase()}...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Exporté en {downloadSuccess.toUpperCase()} !</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter au format</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {showExportMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-56 bg-[#131627] border border-purple-500/30 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-white/5">
                  Formats Disponibles
                </div>

                {/* MP3 Option */}
                <button
                  onClick={() => handleExportFormat('mp3')}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-left hover:bg-purple-600/20 text-gray-200 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="font-bold block">MP3</span>
                      <span className="text-[10px] text-gray-400">192 kbps • CapCut, TikTok, Vidéos</span>
                    </div>
                  </div>
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {/* WAV Option */}
                <button
                  onClick={() => handleExportFormat('wav')}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-left hover:bg-purple-600/20 text-gray-200 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="font-bold block">WAV</span>
                      <span className="text-[10px] text-gray-400">24 kHz • Master HD Non Compressé</span>
                    </div>
                  </div>
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {/* OGG Option */}
                <button
                  onClick={() => handleExportFormat('ogg')}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-left hover:bg-purple-600/20 text-gray-200 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold block">OGG</span>
                      <span className="text-[10px] text-gray-400">Vorbis • Web & Podcasts Haute Qualité</span>
                    </div>
                  </div>
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Segments Drawer */}
      {showSegments && segments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Découpage en {segments.length} segments continus
              </h4>
              <span className="text-[11px] text-gray-400">
                Chaque segment est assemblé sans coupure dans le fichier master
              </span>
            </div>

            {/* Bulk download all segments button */}
            {segments.some((s) => Boolean(s.audioBase64)) && (
              <button
                type="button"
                onClick={downloadAllSegments}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Télécharger chaque segment individuel au format WAV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger tous les segments (.wav)</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {segments.map((seg) => (
              <div
                key={seg.index}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                  activeSegmentIndex === seg.index
                    ? 'bg-purple-900/30 border-purple-500/50 text-white'
                    : 'bg-[#0a0c14] border-white/5 text-gray-300 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-purple-300 font-bold shrink-0">
                    #{seg.index}
                  </span>
                  <p className="truncate text-gray-300 text-xs">{seg.text}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {seg.duration && (
                    <span className="font-mono text-[11px] text-gray-400">
                      {formatTime(seg.duration)}
                    </span>
                  )}
                  {seg.audioBase64 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => playSegment(seg)}
                        className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 transition-colors cursor-pointer"
                        title="Écouter ce segment individuel"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadSingleSegment(seg)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 transition-colors cursor-pointer"
                        title={`Télécharger le segment #${seg.index} (WAV)`}
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    onSegmentRetry && (
                      <button
                        type="button"
                        onClick={() => onSegmentRetry(seg.index)}
                        className="text-[10px] text-red-400 hover:text-red-300 underline font-semibold cursor-pointer"
                      >
                        Réessayer
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
