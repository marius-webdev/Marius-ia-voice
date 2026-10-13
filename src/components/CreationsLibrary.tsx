import React, { useState, useRef, useEffect } from 'react';
import {
  Library,
  Search,
  Filter,
  Play,
  Pause,
  Download,
  Trash2,
  ExternalLink,
  Clock,
  Sparkles,
  Calendar,
  Volume2,
  FileAudio,
  Check,
  ChevronDown,
  Music,
  RotateCcw,
  VolumeX,
} from 'lucide-react';
import { SavedCreation } from '../types.ts';
import { deleteCreation, exportAudio, getCreationDetails } from '../services/api.ts';

interface CreationsLibraryProps {
  creations: SavedCreation[];
  onDeleteSuccess: (id: string) => void;
  onOpenInEditor: (creation: SavedCreation) => void;
}

export const CreationsLibrary: React.FC<CreationsLibraryProps> = ({
  creations,
  onDeleteSuccess,
  onOpenInEditor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoiceFilter, setSelectedVoiceFilter] = useState('all');

  // Currently playing creation
  const [activeCreation, setActiveCreation] = useState<SavedCreation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dropdown states for "Exporter au format"
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [exportingState, setExportingState] = useState<{ id: string; format: string } | null>(null);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside() {
      setOpenDropdownId(null);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handlePlayToggle = async (creation: SavedCreation) => {
    if (activeCreation?.id === creation.id && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    let wavData = creation.audioWavBase64;

    // Fetch full details if base64 is missing
    if (!wavData) {
      setLoadingAudioId(creation.id);
      try {
        const details = await getCreationDetails(creation.id);
        wavData = details.creation.audioWavBase64;
        creation.audioWavBase64 = wavData;
      } catch (err) {
        console.error('Error fetching audio for creation:', err);
        setLoadingAudioId(null);
        return;
      }
      setLoadingAudioId(null);
    }

    setActiveCreation(creation);
    setCurrentTime(0);
    setDuration(creation.duration || 0);

    const src = `data:audio/wav;base64,${wavData}`;
    if (audioRef.current) {
      audioRef.current.src = src;
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !duration) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Export format handler
  const handleExportFormat = async (creation: SavedCreation, format: 'mp3' | 'wav' | 'ogg', e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    setExportingState({ id: creation.id, format });

    try {
      let exportBase64 = '';
      let mime = 'audio/wav';

      if (format === 'wav' && creation.audioWavBase64) {
        exportBase64 = creation.audioWavBase64;
        mime = 'audio/wav';
      } else {
        const result = await exportAudio({
          creationId: creation.id,
          wavBase64: creation.audioWavBase64,
          format,
        });
        exportBase64 = result.audioBase64;
        mime = result.mimeType;
      }

      const cleanTitle = creation.name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-') || 'projet';
      const dateStr = creation.createdAt.slice(0, 10);
      const fileName = `marius-voice-ai-${cleanTitle}-${dateStr}.${format}`;

      const link = document.createElement('a');
      link.href = `data:${mime};base64,${exportBase64}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccessNotice(`${creation.id}-${format}`);
      setTimeout(() => setDownloadSuccessNotice(null), 3500);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportingState(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer cet enregistrement ?')) {
      if (activeCreation?.id === id && audioRef.current) {
        audioRef.current.pause();
        setActiveCreation(null);
        setIsPlaying(false);
      }
      try {
        await deleteCreation(id);
        onDeleteSuccess(id);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const formatDuration = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Filtered and searched creations
  const filteredCreations = creations.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.voiceName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVoice = selectedVoiceFilter === 'all' || item.voiceName === selectedVoiceFilter;
    return matchesSearch && matchesVoice;
  });

  const uniqueVoices = Array.from(new Set(creations.map((c) => c.voiceName)));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <Library className="w-7 h-7 text-purple-400" />
            Bibliothèque Audio : Mes Créations
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Écoutez, gérez et exportez vos fichiers au format <strong>MP3, WAV ou OGG</strong> en un clic.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold font-mono">
            {creations.length} {creations.length > 1 ? 'projets enregistrés' : 'projet enregistré'}
          </span>
        </div>
      </div>

      {/* Active Audio Player Bar (Sticky when playing) */}
      {activeCreation && (
        <div className="bg-gradient-to-r from-purple-950/60 via-[#121528] to-indigo-950/60 rounded-2xl border border-purple-500/40 p-4 sm:p-5 shadow-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePlayToggle(activeCreation)}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-900/40 hover:from-purple-500 hover:to-indigo-500 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">{activeCreation.name}</h3>
                <p className="text-xs text-purple-300">
                  Voix : {activeCreation.voiceName} • {formatDuration(currentTime)} / {formatDuration(duration || activeCreation.duration)}
                </p>
              </div>
            </div>

            {/* Player Controls & Format Export */}
            <div className="flex items-center gap-3">
              {/* Volume */}
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
                  className="w-16 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* "Exporter au format" Dropdown for Active Player */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(openDropdownId === 'player' ? null : 'player');
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-900/30 transition-all cursor-pointer"
                >
                  {exportingState?.id === activeCreation.id ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Export {exportingState.format.toUpperCase()}...</span>
                    </>
                  ) : downloadSuccessNotice?.startsWith(activeCreation.id) ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Téléchargé !</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Exporter au format</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdownId === 'player' ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {openDropdownId === 'player' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-2 w-56 bg-[#131627] border border-purple-500/30 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95"
                  >
                    <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-white/5">
                      Choisir le format d'export
                    </div>
                    <button
                      onClick={(e) => handleExportFormat(activeCreation, 'mp3', e)}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-left hover:bg-purple-600/20 text-gray-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-purple-400" />
                        <div>
                          <span className="font-bold block">MP3</span>
                          <span className="text-[10px] text-gray-400">192 kbps • Vidéos, CapCut, TikTok</span>
                        </div>
                      </div>
                      <Download className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => handleExportFormat(activeCreation, 'wav', e)}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-left hover:bg-purple-600/20 text-gray-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileAudio className="w-4 h-4 text-cyan-400" />
                        <div>
                          <span className="font-bold block">WAV</span>
                          <span className="text-[10px] text-gray-400">24 kHz • Master HD Studio</span>
                        </div>
                      </div>
                      <Download className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => handleExportFormat(activeCreation, 'ogg', e)}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-left hover:bg-purple-600/20 text-gray-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="font-bold block">OGG</span>
                          <span className="text-[10px] text-gray-400">Vorbis/Opus • Web & Podcasts</span>
                        </div>
                      </div>
                      <Download className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scrub Bar */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#101322] p-4 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, extrait ou voix..."
            className="w-full bg-[#0a0c14] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Voice Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={selectedVoiceFilter}
            onChange={(e) => setSelectedVoiceFilter(e.target.value)}
            className="bg-[#0a0c14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">Toutes les voix</option>
            {uniqueVoices.map((v) => (
              <option key={v} value={v}>
                Voix : {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Creations Grid */}
      {filteredCreations.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#101322] border border-dashed border-white/10 rounded-3xl">
          <Library className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-300">Aucune création trouvée</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {searchQuery
              ? 'Aucun projet ne correspond à votre recherche. Essayez d\'autres mots-clés.'
              : 'Générez votre premier enregistrement audio depuis l\'onglet Synthèse Vocale !'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCreations.map((item) => {
            const isItemPlaying = activeCreation?.id === item.id && isPlaying;
            const isLoading = loadingAudioId === item.id;
            const isMenuOpen = openDropdownId === item.id;
            const isItemExporting = exportingState?.id === item.id;

            return (
              <div
                key={item.id}
                className="bg-[#101322] hover:bg-[#131627] rounded-2xl border border-white/5 hover:border-purple-500/30 p-5 transition-all shadow-xl flex flex-col justify-between space-y-4 relative"
              >
                {/* Top Info */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-bold text-base text-white hover:text-purple-300 transition-colors">
                        {item.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1 font-mono text-[11px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                          <Volume2 className="w-3 h-3" />
                          {item.voiceName}
                        </span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-gray-500" />
                          {formatDuration(item.duration)}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {item.segmentCount} {item.segmentCount > 1 ? 'segments' : 'segment'}
                        </span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                      title="Supprimer ce projet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Text Excerpt */}
                  <div className="p-3 rounded-xl bg-[#090b14] border border-white/5 text-xs text-gray-300 line-clamp-3 italic">
                    "{item.text}"
                  </div>
                </div>

                {/* Bottom Player and "Exporter au format" Bar */}
                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                  {/* Play Button */}
                  <button
                    onClick={() => handlePlayToggle(item)}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow transition-all active:scale-95 cursor-pointer ${
                      isItemPlaying
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Chargement...
                      </>
                    ) : isItemPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Écouter
                      </>
                    )}
                  </button>

                  {/* Actions & "Exporter au format" dropdown */}
                  <div className="flex items-center gap-2">
                    {/* Open in TTS Editor */}
                    <button
                      onClick={() => onOpenInEditor(item)}
                      className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      title="Ouvrir le texte dans l'éditeur de synthèse vocale"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    {/* Prominent "Exporter au format" Button with Dropdown for MP3, WAV or OGG */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(isMenuOpen ? null : item.id);
                        }}
                        disabled={isItemExporting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-purple-500/30 text-purple-200 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                        title="Choisir le format d'exportation : MP3, WAV ou OGG"
                      >
                        {isItemExporting ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Export {exportingState?.format.toUpperCase()}...</span>
                          </>
                        ) : downloadSuccessNotice?.startsWith(item.id) ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Exporté !</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-purple-400" />
                            <span>Exporter au format</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                          </>
                        )}
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 bottom-full mb-2 w-56 bg-[#131627] border border-purple-500/30 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95"
                        >
                          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-white/5">
                            Choisir le format d'export
                          </div>

                          {/* MP3 */}
                          <button
                            onClick={(e) => handleExportFormat(item, 'mp3', e)}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-left hover:bg-purple-600/20 text-gray-200 hover:text-white transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Music className="w-4 h-4 text-purple-400" />
                              <div>
                                <span className="font-bold block">MP3</span>
                                <span className="text-[10px] text-gray-400">192 kbps • CapCut, TikTok, Réseaux</span>
                              </div>
                            </div>
                            <Download className="w-3.5 h-3.5 text-gray-500" />
                          </button>

                          {/* WAV */}
                          <button
                            onClick={(e) => handleExportFormat(item, 'wav', e)}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-left hover:bg-purple-600/20 text-gray-200 hover:text-white transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <FileAudio className="w-4 h-4 text-cyan-400" />
                              <div>
                                <span className="font-bold block">WAV</span>
                                <span className="text-[10px] text-gray-400">24 kHz • Master HD Studio</span>
                              </div>
                            </div>
                            <Download className="w-3.5 h-3.5 text-gray-500" />
                          </button>

                          {/* OGG */}
                          <button
                            onClick={(e) => handleExportFormat(item, 'ogg', e)}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-left hover:bg-purple-600/20 text-gray-200 hover:text-white transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-400" />
                              <div>
                                <span className="font-bold block">OGG</span>
                                <span className="text-[10px] text-gray-400">Vorbis/Opus • Web & Podcasts</span>
                              </div>
                            </div>
                            <Download className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
