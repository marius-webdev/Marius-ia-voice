import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  concatenateWavBuffers,
  convertAudioWithFfmpeg,
  createWavHeader,
  extractPcmFromWav,
  getWavDuration,
  splitTextIntoSegments,
  wavToMp3,
} from './server/audioUtils.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// CORS headers to prevent iframe proxy cross-origin fetch failures
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// High body limit to support base64 audio uploads and downloads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Ensure data storage directory exists
const DATA_DIR = path.join(__dirname, 'data');
const CREATIONS_FILE = path.join(DATA_DIR, 'creations.json');
const VOICES_FILE = path.join(DATA_DIR, 'custom_voices.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

// Helpers for persisting creations and custom voices
function loadCreations(): any[] {
  try {
    if (fs.existsSync(CREATIONS_FILE)) {
      const raw = fs.readFileSync(CREATIONS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading creations:', e);
  }
  return [];
}

function saveCreations(creations: any[]) {
  try {
    fs.writeFileSync(CREATIONS_FILE, JSON.stringify(creations, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving creations:', e);
  }
}

function loadCustomVoices(): any[] {
  try {
    if (fs.existsSync(VOICES_FILE)) {
      const raw = fs.readFileSync(VOICES_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading custom voices:', e);
  }
  return [];
}

function saveCustomVoices(voices: any[]) {
  try {
    fs.writeFileSync(VOICES_FILE, JSON.stringify(voices, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving custom voices:', e);
  }
}

// Shared Gemini client utility with User-Agent header for telemetry
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Clé API GEMINI_API_KEY non configurée dans l\'environnement.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Prebuilt voices available via gemini-3.8-flash-tts
const PREBUILT_VOICES = [
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    tone: 'Chaleureuse, Mélodieuse & Naturelle',
    description: 'Voix féminine apaisante et articulée, idéale pour la narration, les récits, le luxe et les documentaires.',
    recommendedFor: ['Récit / Storytelling', 'Publicité Luxe', 'Calme & Méditation', 'Présentation'],
    languages: ['Français', 'Anglais', 'Espagnol', 'Allemand', 'Italien'],
    previewPrompt: 'Bienvenue sur Marius Voice AI. La voix au service de vos plus grands projets créatifs.',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'male',
    tone: 'Dynamique, Énergique & Enthousiaste',
    description: 'Voix masculine jeune et percutante, excellente pour les vidéos TikTok, YouTube et les spots publicitaires rythmés.',
    recommendedFor: ['Voix-off TikTok', 'Narration YouTube', 'Publicité Commerciale', 'Réseaux Sociaux'],
    languages: ['Français', 'Anglais', 'Espagnol', 'Allemand'],
    previewPrompt: 'Salut à tous ! Découvrez la puissance de la synthèse vocale nouvelle génération.',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    tone: 'Grave, Profonde, Posée & Résonnante',
    description: 'Voix masculine mature avec une présence captivante, parfaite pour les documentaires, le cinéma et les présentations corporate.',
    recommendedFor: ['Documentaire', 'Présentation Professionnelle', 'Cinéma & Trailer', 'Storytelling immersif'],
    languages: ['Français', 'Anglais', 'Espagnol'],
    previewPrompt: 'Au cœur de chaque histoire réside une voix capable de marquer les esprits.',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    tone: 'Puissante, Inspirante & Décidée',
    description: 'Voix masculine charismatique et intense, remarquable pour les discours de motivation, le sport et les bandes-annonces.',
    recommendedFor: ['Discours Motivationnel', 'Bande-annonce', 'Gaming', 'Sport & Dépassement'],
    languages: ['Français', 'Anglais'],
    previewPrompt: 'Rien n\'est impossible pour celui qui a la volonté inébranlable de réussir.',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'female',
    tone: 'Claire, Fluide, Posée & Pédagogique',
    description: 'Voix féminine professionnelle et limpide, idéale pour les podcasts, les cours en ligne, le e-learning et les actualités.',
    recommendedFor: ['Conversation Naturelle', 'Podcast', 'E-Learning & Formation', 'Actualités'],
    languages: ['Français', 'Anglais', 'Espagnol', 'Italien'],
    previewPrompt: 'Comprendre et maîtriser la voix artificielle n\'a jamais été aussi simple et intuitif.',
  },
];

// --- API ROUTES ---

// Health & configuration check
app.get('/api/health', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    model: 'gemini-3.8-flash-tts',
    sampleRate: 24000,
    timestamp: new Date().toISOString(),
  });
});

// List prebuilt voices
app.get('/api/voices', (req: Request, res: Response) => {
  res.json({
    voices: PREBUILT_VOICES,
    model: 'gemini-3.8-flash-tts',
  });
});

// Custom voices
app.get('/api/custom-voices', (req: Request, res: Response) => {
  const customVoices = loadCustomVoices();
  res.json({ customVoices });
});

app.post('/api/custom-voices', (req: Request, res: Response) => {
  try {
    const { name, baseVoice, stylePrompt, rhythm, pitch, description, consentGiven } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom de la voix personnalisée est requis.' });
    }
    if (!consentGiven) {
      return res.status(400).json({ error: 'Le consentement explicite d\'utilisation de la voix est obligatoire.' });
    }

    const customVoices = loadCustomVoices();
    const newVoice = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      baseVoice: baseVoice || 'Kore',
      stylePrompt: stylePrompt || 'Voix naturelle et expressive, débit personnalisé',
      rhythm: rhythm || 'normal',
      pitch: pitch || 'medium',
      description: description || 'Voix personnalisée clonée via Marius Voice AI',
      createdAt: new Date().toISOString(),
      isCustom: true,
      consentGiven: true,
    };

    customVoices.unshift(newVoice);
    saveCustomVoices(customVoices);

    res.status(201).json({ voice: newVoice });
  } catch (err: any) {
    console.error('Error creating custom voice:', err);
    res.status(500).json({ error: err.message || 'Échec de la création de la voix personnalisée.' });
  }
});

app.delete('/api/custom-voices/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let customVoices = loadCustomVoices();
    customVoices = customVoices.filter((v: any) => v.id !== id);
    saveCustomVoices(customVoices);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting custom voice:', err);
    res.status(500).json({ error: err.message || 'Échec de la suppression de la voix.' });
  }
});

// Voice analysis using Gemini (gemini-3.8-flash)
app.post('/api/voice/analyze', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', fileName, durationSeconds } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Aucun enregistrement audio fourni pour l\'analyse.' });
    }

    const ai = getGenAIClient();

    const analysisPrompt = `Tu es un ingénieur du son et spécialiste de la phonétique vocale pour Marius Voice AI.
Analyse cet échantillon vocal pour caractériser la voix de l'utilisateur en vue de configurer un profil de voix sur-mesure (Voice Cloning / Voice Design).

Effectue une analyse acoustique rigoureuse et retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "transcript": "Transcription fidèle du texte parlé dans l'audio",
  "wordCount": 0,
  "wordsPerMinute": 0,
  "pitchCategory": "grave" | "médium" | "aigu",
  "pitchHzEstimate": "ex: 120-150 Hz",
  "tempoStyle": "rapide" | "modéré" | "posé" | "dynamique",
  "vocalTimbre": "Description précise du grain de voix (chaud, feutré, métallique, résonnant, doux...)",
  "pauseAnalysis": "Description des pauses et silences observés dans le rythme",
  "clarityScore": 92,
  "backgroundNoiseLevel": "faible" | "modéré" | "élevé",
  "audioQualityFeedback": "Retour sur la qualité acoustique de l'enregistrement",
  "recommendedBaseVoice": "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr",
  "recommendedStylePrompt": "Prompt de style vocal précis à transmettre au modèle gemini-3.8-flash-tts pour reproduire le ton, le rythme, l'émotion et l'intonation de cette personne en français",
  "accent": "Neutre français standard / Régional / Spécifique"
}
Réponds uniquement en JSON sans balises markdown.`;

    const cleanMime = mimeType.split(';')[0];
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: audioBase64,
              },
            },
            {
              text: analysisPrompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text || '{}';
    let analysisData: any = {};
    try {
      analysisData = JSON.parse(rawText.trim());
    } catch {
      // Fallback parser if markdown wrapping exists
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Impossible d\'extraire les données JSON de l\'analyse acoustique.');
      }
    }

    res.json({
      success: true,
      analysis: analysisData,
      audioDuration: durationSeconds || 0,
    });
  } catch (err: any) {
    console.error('Error analyzing voice sample:', err);
    res.status(500).json({
      error: err.message || 'Erreur lors de l\'analyse vocale.',
    });
  }
});

// Single segment TTS generation using gemini-3.8-flash-tts
app.post('/api/tts/generate-segment', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore', style = '', speed = 1.0, pitch = 'normal' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Le texte du segment est vide.' });
    }

    const ai = getGenAIClient();

    // Map custom voice if needed
    let finalVoice = voiceName;
    let enrichedStyle = style ? `${style}. ` : '';

    if (speed !== 1.0) {
      enrichedStyle += speed > 1.0 ? 'Parler d\'un ton plus vif et rapide. ' : 'Parler d\'un ton plus lent, posé et réfléchi. ';
    }
    if (pitch === 'deep') {
      enrichedStyle += 'Tonalité plus grave et posée. ';
    } else if (pitch === 'high') {
      enrichedStyle += 'Tonalité plus claire et haute. ';
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              speechMetadata: {
                style: enrichedStyle.trim() || 'Narration claire, naturelle et professionnelle en français.',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: finalVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('Le modèle n\'a retourné aucune donnée audio pour ce segment.');
    }

    const wavBuffer = Buffer.from(base64Audio, 'base64');
    const duration = getWavDuration(wavBuffer);

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      duration,
      byteSize: wavBuffer.length,
    });
  } catch (err: any) {
    console.error('Error generating audio segment:', err);
    res.status(500).json({
      error: err.message || 'Erreur lors de la synthèse vocale du segment.',
    });
  }
});

// Full multi-segment generation and assembly for long scripts
app.post('/api/tts/generate-full', async (req: Request, res: Response) => {
  try {
    const {
      text,
      voiceName = 'Kore',
      customVoiceId,
      style = '',
      speed = 1.0,
      pitch = 'normal',
      projectName = 'Nouveau Projet Vocal',
      format = 'both', // 'wav' | 'mp3' | 'both'
    } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Le script textuel est obligatoire.' });
    }

    // Resolve voice and style if it's a custom voice
    let resolvedVoice = voiceName;
    let resolvedStyle = style;

    if (customVoiceId) {
      const customVoices = loadCustomVoices();
      const customProfile = customVoices.find((v: any) => v.id === customVoiceId);
      if (customProfile) {
        resolvedVoice = customProfile.baseVoice || 'Kore';
        resolvedStyle = `${customProfile.stylePrompt}. ${style}`.trim();
      }
    }

    // Divide text into manageable segments honoring sentences & paragraphs
    const segmentsText = splitTextIntoSegments(text, 100);
    const ai = getGenAIClient();

    let enrichedStyle = resolvedStyle ? `${resolvedStyle}. ` : '';
    if (speed !== 1.0) {
      enrichedStyle += speed > 1.0 ? 'Parler d\'un ton plus vif et rapide. ' : 'Parler d\'un ton plus lent et posé. ';
    }
    if (pitch === 'deep') {
      enrichedStyle += 'Tonalité plus grave. ';
    } else if (pitch === 'high') {
      enrichedStyle += 'Tonalité plus aiguë et brillante. ';
    }

    const completedSegments: Array<{
      index: number;
      text: string;
      audioBase64: string;
      duration: number;
      byteSize: number;
    }> = [];

    const wavBuffers: Buffer[] = [];

    // Process each segment sequentially with per-segment error handling
    for (let i = 0; i < segmentsText.length; i++) {
      const segText = segmentsText[i];
      let attempts = 0;
      let success = false;
      let lastErr: any = null;

      while (attempts < 2 && !success) {
        attempts++;
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: segText,
                    speechMetadata: {
                      style: enrichedStyle.trim() || 'Narration claire, naturelle et professionnelle en français.',
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: resolvedVoice },
                },
              },
            },
          });

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!base64Audio) {
            throw new Error(`Aucune donnée audio retournée pour le segment ${i + 1}`);
          }

          const buf = Buffer.from(base64Audio, 'base64');
          const dur = getWavDuration(buf);

          wavBuffers.push(buf);
          completedSegments.push({
            index: i + 1,
            text: segText,
            audioBase64: base64Audio,
            duration: dur,
            byteSize: buf.length,
          });

          success = true;
        } catch (err: any) {
          lastErr = err;
          console.warn(`Segment ${i + 1} attempt ${attempts} failed:`, err.message);
          if (attempts < 2) {
            // Small backoff before retry
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }

      if (!success) {
        throw new Error(`Échec de la génération sur le segment ${i + 1}/${segmentsText.length} : ${lastErr?.message || 'Erreur inconnue'}`);
      }
    }

    // Assemble all WAV buffers into one continuous master WAV
    const masterWavBuffer = concatenateWavBuffers(wavBuffers);
    const masterWavBase64 = masterWavBuffer.toString('base64');
    const totalDuration = getWavDuration(masterWavBuffer);

    // Generate MP3 version as well for video editors (CapCut, Premiere, DaVinci)
    let masterMp3Base64 = '';
    try {
      const mp3Buf = wavToMp3(masterWavBuffer);
      masterMp3Base64 = mp3Buf.toString('base64');
    } catch (mp3Err) {
      console.error('MP3 encoding failed, fallback to WAV:', mp3Err);
    }

    // Save project into persistent creations
    const creationId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCreation = {
      id: creationId,
      name: projectName.trim() || `Voiceover_${new Date().toISOString().slice(0, 10)}`,
      text,
      voiceName: resolvedVoice,
      customVoiceId: customVoiceId || null,
      style: resolvedStyle,
      speed,
      pitch,
      duration: totalDuration,
      segmentCount: completedSegments.length,
      createdAt: new Date().toISOString(),
      audioWavBase64: masterWavBase64,
      audioMp3Base64: masterMp3Base64 || masterWavBase64,
      fileSizeWav: masterWavBuffer.length,
      fileSizeMp3: masterMp3Base64 ? Buffer.from(masterMp3Base64, 'base64').length : masterWavBuffer.length,
    };

    const creations = loadCreations();
    creations.unshift({
      ...newCreation,
      // Store in creations list
    });
    // Keep max 50 creations to avoid memory issues
    if (creations.length > 50) {
      creations.splice(50);
    }
    saveCreations(creations);

    res.json({
      success: true,
      creationId,
      masterWavBase64,
      totalDuration,
      segmentCount: completedSegments.length,
      segments: completedSegments.map((s) => ({
        index: s.index,
        text: s.text,
        duration: s.duration,
        byteSize: s.byteSize,
      })),
      fileSizeWav: masterWavBuffer.length,
    });
  } catch (err: any) {
    console.error('Error in generate-full:', err);
    res.status(500).json({
      error: err.message || 'Erreur lors de la génération complète de l\'audio.',
    });
  }
});

// Intelligent script segmentation endpoint
app.post('/api/tts/split-segments', (req: Request, res: Response) => {
  const { text, maxWords = 80 } = req.body;
  const segments = splitTextIntoSegments(text || '', maxWords);
  res.json({ segments });
});

// Concatenate segment audio buffers into master WAV
app.post('/api/tts/concatenate', async (req: Request, res: Response) => {
  try {
    const {
      segmentBase64s,
      projectName = 'Voiceover',
      text = '',
      voiceName = 'Kore',
      customVoiceId = null,
      style = '',
      speed = 1.0,
      pitch = 'normal',
    } = req.body;

    if (!segmentBase64s || !Array.isArray(segmentBase64s) || segmentBase64s.length === 0) {
      return res.status(400).json({ error: 'Aucun segment audio fourni à assembler.' });
    }

    const buffers = segmentBase64s.map((b64: string) => Buffer.from(b64, 'base64'));
    const combinedWav = concatenateWavBuffers(buffers);
    const duration = getWavDuration(combinedWav);

    // Save project into persistent creations
    const creationId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCreation = {
      id: creationId,
      name: projectName.trim() || `Voiceover_${new Date().toISOString().slice(0, 10)}`,
      text,
      voiceName,
      customVoiceId: customVoiceId || null,
      style,
      speed,
      pitch,
      duration,
      segmentCount: segmentBase64s.length,
      createdAt: new Date().toISOString(),
      audioWavBase64: combinedWav.toString('base64'),
      fileSizeWav: combinedWav.length,
    };

    const creations = loadCreations();
    creations.unshift(newCreation);
    if (creations.length > 50) creations.splice(50);
    saveCreations(creations);

    res.json({
      success: true,
      creationId,
      wavBase64: combinedWav.toString('base64'),
      duration,
      byteSizeWav: combinedWav.length,
    });
  } catch (err: any) {
    console.error('Error concatenating audio:', err);
    res.status(500).json({ error: err.message || 'Échec de l\'assemblage des fichiers audio.' });
  }
});

// Audio export endpoint supporting MP3, WAV and OGG format conversion
app.post('/api/audio/export', async (req: Request, res: Response) => {
  try {
    const { wavBase64, creationId, format = 'mp3' } = req.body;
    let inputWavBase64 = wavBase64;

    if (!inputWavBase64 && creationId) {
      const creations = loadCreations();
      const target = creations.find((c: any) => c.id === creationId);
      if (target) {
        inputWavBase64 = target.audioWavBase64;
      }
    }

    if (!inputWavBase64) {
      return res.status(400).json({ error: 'Fichier audio source introuvable.' });
    }

    const targetFormat = (format === 'ogg' ? 'ogg' : format === 'wav' ? 'wav' : 'mp3') as 'mp3' | 'wav' | 'ogg';
    const wavBuf = Buffer.from(inputWavBase64, 'base64');
    const convertedBuf = await convertAudioWithFfmpeg(wavBuf, targetFormat);

    const mimeTypes: Record<string, string> = {
      wav: 'audio/wav',
      mp3: 'audio/mp3',
      ogg: 'audio/ogg',
    };

    res.json({
      success: true,
      format: targetFormat,
      mimeType: mimeTypes[targetFormat] || 'audio/mpeg',
      audioBase64: convertedBuf.toString('base64'),
      byteSize: convertedBuf.length,
    });
  } catch (err: any) {
    console.error('Audio export error:', err);
    res.status(500).json({ error: err.message || 'Échec de l\'exportation au format demandé.' });
  }
});

// Creations list
app.get('/api/creations', (req: Request, res: Response) => {
  const creations = loadCreations();
  // Return light list (omit massive base64 for initial list to speed up loading, provide endpoint to fetch audio by ID)
  const previews = creations.map((c: any) => ({
    id: c.id,
    name: c.name,
    text: c.text,
    voiceName: c.voiceName,
    style: c.style,
    duration: c.duration,
    segmentCount: c.segmentCount,
    createdAt: c.createdAt,
    fileSizeWav: c.fileSizeWav,
    fileSizeMp3: c.fileSizeMp3,
    hasAudio: Boolean(c.audioWavBase64),
  }));
  res.json({ creations: previews });
});

// Get creation audio
app.get('/api/creations/:id', (req: Request, res: Response) => {
  const creations = loadCreations();
  const creation = creations.find((c: any) => c.id === req.params.id);
  if (!creation) {
    return res.status(404).json({ error: 'Création introuvable.' });
  }
  res.json({ creation });
});

// Delete creation
app.delete('/api/creations/:id', (req: Request, res: Response) => {
  try {
    let creations = loadCreations();
    creations = creations.filter((c: any) => c.id !== req.params.id);
    saveCreations(creations);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Échec de suppression.' });
  }
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Marius Voice AI] Serveur démarré avec succès sur le port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
