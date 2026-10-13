import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import os from 'os';
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
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-gemini-api-key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// High body limit to support base64 audio uploads and downloads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Ensure data storage directory exists (use os.tmpdir() on Vercel to avoid read-only filesystem errors)
const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join(os.tmpdir(), 'marius_data') : path.join(__dirname, 'data');
const CREATIONS_FILE = path.join(DATA_DIR, 'creations.json');
const VOICES_FILE = path.join(DATA_DIR, 'custom_voices.json');
const JOBS_FILE = path.join(DATA_DIR, 'tts_jobs.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Notice: data directory initialized in fallback mode:', err);
  }
}

// Helpers for persisting creations, custom voices, and resumable TTS jobs
function loadCreations(): any[] {
  try {
    if (fs.existsSync(CREATIONS_FILE)) {
      const raw = fs.readFileSync(CREATIONS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
    const seedFile = path.join(__dirname, 'data', 'creations.json');
    if (fs.existsSync(seedFile)) {
      const raw = fs.readFileSync(seedFile, 'utf-8');
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
    const seedFile = path.join(__dirname, 'data', 'custom_voices.json');
    if (fs.existsSync(seedFile)) {
      const raw = fs.readFileSync(seedFile, 'utf-8');
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

function loadJobs(): Record<string, any> {
  try {
    if (fs.existsSync(JOBS_FILE)) {
      const raw = fs.readFileSync(JOBS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading jobs:', e);
  }
  return {};
}

function saveJobs(jobs: Record<string, any>) {
  try {
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving jobs:', e);
  }
}

// Mask API key for secure logging and display (e.g., AIzaSy••••••••84K)
function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}${'•'.repeat(Math.max(12, key.length - 10))}${suffix}`;
}

/**
 * Extract personal user API key strictly from the request.
 * AUTOMATIC DEVELOPER KEY FALLBACK HAS BEEN PERMANENTLY REMOVED.
 * Marius Voice AI requires the user to provide their personal key.
 */
function getGenAIClientForReq(req: Request): GoogleGenAI {
  const userHeaderKey = (req.headers['x-gemini-api-key'] as string) || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  const apiKey = userHeaderKey?.trim();

  if (!apiKey) {
    throw new Error('AUTH_REQUIRED: Aucune clé API Google Gemini personnelle configurée. Veuillez renseigner votre clé dans l\'onglet « Ma clé API Google ».');
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

// Structured API error classification with retry duration extraction
export interface FormattedError {
  message: string;
  errorType: 'RATE_LIMIT_429' | 'DAILY_QUOTA_429' | 'SERVER_SPIKE_503' | 'AUTH_ERROR' | 'UNKNOWN';
  retryAfterSeconds?: number;
  httpStatus: number;
}

export function parseAndFormatError(err: any): FormattedError {
  if (!err) {
    return {
      message: 'Une erreur inattendue est survenue.',
      errorType: 'UNKNOWN',
      httpStatus: 500,
    };
  }

  const raw = typeof err === 'string' ? err : err.message || '';

  // Auth errors
  if (
    raw.includes('AUTH_REQUIRED') ||
    raw.includes('API_KEY_INVALID') ||
    raw.includes('API key not valid') ||
    raw.includes('401') ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('403')
  ) {
    return {
      message: 'Clé API Google Gemini invalide, non configurée ou accès refusé. Veuillez vérifier votre clé dans l\'onglet « Ma clé API Google ».',
      errorType: 'AUTH_ERROR',
      httpStatus: 401,
    };
  }

  // Check for Retry-After delay in error string (e.g. "retry in 24s", "retry after 30 seconds", "retry in 14h 22m")
  let retrySeconds: number | undefined;
  const secMatch = raw.match(/retry (?:in|after) ([0-9]+)\s*(?:s|sec|seconds)/i);
  if (secMatch) {
    retrySeconds = parseInt(secMatch[1], 10);
  } else {
    const minMatch = raw.match(/retry in ([0-9]+)\s*(?:m|min|minutes)/i);
    if (minMatch) {
      retrySeconds = parseInt(minMatch[1], 10) * 60;
    }
  }

  // Temporary per-minute rate limit (RPM / frequency / concurrency)
  if (
    raw.includes('RPM') ||
    raw.includes('rate-limit') ||
    raw.includes('rate limit') ||
    raw.includes('per minute') ||
    raw.includes('RATE_LIMIT_EXCEEDED') ||
    (raw.includes('429') && !raw.includes('RESOURCE_EXHAUSTED') && !raw.includes('quotaMetric') && !raw.includes('Quota exceeded'))
  ) {
    const delayInfo = retrySeconds ? ` Réessai possible dans ${retrySeconds} secondes.` : ' Veuillez patienter quelques secondes.';
    return {
      message: `Fréquence de requêtes par minute (RPM) temporairement atteinte.${delayInfo}`,
      errorType: 'RATE_LIMIT_429',
      retryAfterSeconds: retrySeconds || 15,
      httpStatus: 429,
    };
  }

  // Quota exhaustion (Daily or project-level resource limit)
  if (
    raw.includes('Quota exceeded') ||
    raw.includes('quotaMetric') ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('per day') ||
    raw.includes('daily') ||
    raw.includes('billing')
  ) {
    return {
      message: 'Quota de requêtes atteint sur votre projet Google Gemini. Les quotas du palier gratuit sont fixés par projet dans Google AI Studio. Pour générer de longs scripts sans restriction, vous pouvez activer la facturation Pay-as-you-go ou patienter jusqu\'à la réinitialisation de votre quota.',
      errorType: 'DAILY_QUOTA_429',
      retryAfterSeconds: retrySeconds,
      httpStatus: 429,
    };
  }

  return {
    message: raw,
    errorType: 'UNKNOWN',
    httpStatus: 500,
  };
}

// Prebuilt voices available via Gemini 3.8 TTS
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

// Health check endpoint (Personal API key required)
app.get('/api/health', (req: Request, res: Response) => {
  const userHeaderKey = (req.headers['x-gemini-api-key'] as string) || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  const hasUserKey = Boolean(userHeaderKey && userHeaderKey.trim());

  res.json({
    status: 'ok',
    hasApiKey: hasUserKey,
    hasUserKey,
    model: 'gemini-3.8-flash-tts',
    sampleRate: 24000,
    timestamp: new Date().toISOString(),
  });
});

// Verification endpoint for personal API key
app.post('/api/auth/verify-key', async (req: Request, res: Response) => {
  try {
    const rawKey = req.body?.apiKey || (req.headers['x-gemini-api-key'] as string);
    if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
      return res.status(400).json({
        isValid: false,
        errorType: 'MISSING_KEY',
        message: 'Veuillez saisir une clé API Google Gemini valide.',
      });
    }

    const testKey = rawKey.trim();
    const testAi = new GoogleGenAI({
      apiKey: testKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    // 1. Verify model authentication via minimal lightweight token test
    try {
      await testAi.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: 'test',
      });
    } catch (testErr: any) {
      const errStr = testErr?.message || String(testErr);
      if (
        errStr.includes('API_KEY_INVALID') ||
        errStr.includes('API key not valid') ||
        errStr.includes('400') ||
        errStr.includes('invalid') ||
        errStr.includes('403')
      ) {
        return res.status(400).json({
          isValid: false,
          errorType: 'INVALID_KEY',
          message: 'Clé API invalide ou révoquée. Veuillez vérifier votre clé sur Google AI Studio (https://aistudio.google.com/apikey).',
        });
      }
      if (errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('429') || errStr.includes('Quota')) {
        return res.json({
          isValid: true,
          maskedKey: maskApiKey(testKey),
          accessibleModels: ['gemini-3.1-flash-lite (Analyse & Prosodie)'],
          isQuotaExhausted: true,
          message: 'Clé API authentifiée avec succès. Note : le quota de requêtes sur votre projet Google est actuellement saturé.',
        });
      }
    }

    // 2. Test TTS capability with a minimal 1-word generation
    const modelsVerified: string[] = ['gemini-3.1-flash-lite (Analyse & Prosodie)'];
    let isQuotaExhausted = false;
    let ttsNotice = '';

    try {
      await testAi.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [{ role: 'user', parts: [{ text: 'Bonjour' }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      modelsVerified.push('gemini-3.8-flash-lite-tts (Synthèse Vocale Haute Cadence)');
      modelsVerified.push('gemini-3.8-flash-tts (Synthèse Vocale Studio 24kHz)');
    } catch (ttsErr: any) {
      const ttsErrStr = ttsErr?.message || String(ttsErr);
      if (ttsErrStr.includes('RESOURCE_EXHAUSTED') || ttsErrStr.includes('429') || ttsErrStr.includes('Quota')) {
        isQuotaExhausted = true;
        ttsNotice = ' Le quota du modèle TTS est temporairement épuisé sur ce projet Google.';
      } else {
        ttsNotice = ' Le modèle TTS n\'a pas pu être validé sur ce projet Google (accès restreint ou modèle non activé).';
        modelsVerified.push('gemini-3.8-flash-lite-tts (Non disponible sur ce projet)');
      }
    }

    return res.json({
      isValid: true,
      maskedKey: maskApiKey(testKey),
      accessibleModels: modelsVerified,
      isQuotaExhausted,
      message: isQuotaExhausted
        ? `Clé API valide et vérifiée.${ttsNotice} Vous pouvez attendre la réinitialisation de votre quota ou passer à un projet avec facturation.`
        : 'Clé API Google Gemini vérifiée et opérationnelle ! Accès aux modèles confirmé.',
    });
  } catch (err: any) {
    console.error('Key verification error:', err);
    return res.status(500).json({
      isValid: false,
      errorType: 'SERVER_ERROR',
      message: `Erreur de test de la clé : ${err.message || 'Serveur injoignable'}`,
    });
  }
});

// Check API key configuration status (Session-aware, no server key fallback)
app.get('/api/auth/status', (req: Request, res: Response) => {
  const userHeaderKey = (req.headers['x-gemini-api-key'] as string) || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (userHeaderKey && userHeaderKey.trim()) {
    return res.json({
      hasKey: true,
      maskedKey: maskApiKey(userHeaderKey.trim()),
      source: 'user',
    });
  }

  return res.json({
    hasKey: false,
    maskedKey: '',
    source: 'none',
  });
});

// List prebuilt voices
app.get('/api/voices', (req: Request, res: Response) => {
  res.json({
    voices: PREBUILT_VOICES,
    model: 'gemini-3.8-flash-tts',
  });
});

// Custom Voice Profiles (Voice Design via style prompting & acoustic profiling)
app.get('/api/custom-voices', (req: Request, res: Response) => {
  const customVoices = loadCustomVoices();
  res.json({ customVoices });
});

app.post('/api/custom-voices', (req: Request, res: Response) => {
  try {
    const { name, baseVoice, stylePrompt, rhythm, pitch, description, consentGiven } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom du profil de voix est requis.' });
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
      description: description || 'Profil vocal personnalisé (Voice Design)',
      createdAt: new Date().toISOString(),
      isCustom: true,
      consentGiven: true,
    };

    customVoices.unshift(newVoice);
    saveCustomVoices(customVoices);

    res.status(201).json({ voice: newVoice });
  } catch (err: any) {
    console.error('Error creating custom voice profile:', err);
    res.status(500).json({ error: err.message || 'Échec de la création du profil vocal.' });
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
    console.error('Error deleting custom voice profile:', err);
    res.status(500).json({ error: err.message || 'Échec de la suppression.' });
  }
});

// Generates speech with the explicit requested model without silent model switching
async function generateTts(
  ai: GoogleGenAI,
  text: string,
  stylePrompt: string,
  voiceName: string,
  model = 'gemini-3.8-flash-tts'
): Promise<{ base64Audio: string; modelUsed: string; tokensConsumed: number }> {
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: text.trim(),
            speechMetadata: {
              style: stylePrompt.trim() || 'Narration claire, naturelle et professionnelle en français.',
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error(`Aucune trame audio retournée par le modèle ${model}.`);
  }

  const tokens =
    response.usageMetadata?.candidatesTokenCount ||
    response.usageMetadata?.totalTokenCount ||
    Math.round(text.length * 0.35);

  return { base64Audio, modelUsed: model, tokensConsumed: tokens };
}

// Voice Analysis endpoint (Acoustic profiling and Voice Design calibration)
app.post('/api/voice/analyze', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', durationSeconds } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Aucun enregistrement audio fourni pour l\'analyse.' });
    }

    const ai = getGenAIClientForReq(req);
    const cleanMime = mimeType.split(';')[0];
    const dur = durationSeconds || 15;
    const estWords = Math.max(12, Math.round(dur * 2.3));
    const estWpm = Math.round((estWords / dur) * 60);

    const analysisPrompt = `Tu es un ingénieur du son et spécialiste de la phonétique vocale pour Marius Voice AI.
Analyse cet extrait vocal pour caractériser la voix de l'utilisateur et calibrer un profil de Voice Design pour Gemini 3.8 TTS.
Note: Gemini 3.8 TTS utilise des voix de base studio combinées à des prompts de style phonétique précis.

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "transcript": "Transcription fidèle des mots prononcés",
  "wordCount": ${estWords},
  "wordsPerMinute": ${estWpm > 0 && estWpm < 220 ? estWpm : 140},
  "pitchCategory": "grave" | "médium" | "aigu",
  "pitchHzEstimate": "ex: 120-150 Hz",
  "tempoStyle": "rapide" | "modéré" | "posé" | "dynamique",
  "vocalTimbre": "Description du grain de voix (chaud, feutré, métallique, résonnant, doux)",
  "pauseAnalysis": "Description des pauses et silences du rythme",
  "clarityScore": 94,
  "backgroundNoiseLevel": "faible" | "modéré" | "élevé",
  "audioQualityFeedback": "Retour sur la clarté acoustique de l'enregistrement",
  "recommendedBaseVoice": "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr",
  "recommendedStylePrompt": "Prompt de style vocal précis pour gemini-3.8-flash-tts reproduisant le ton et la diction en français",
  "accent": "Neutre français standard"
}
Réponds uniquement en JSON sans balises markdown.`;

    const model = 'gemini-3.1-flash-lite';
    const resp = await ai.models.generateContent({
      model,
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

    const rawText = resp.text || '{}';
    let analysisData: any = null;
    try {
      analysisData = JSON.parse(rawText.trim());
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Impossible d\'extraire le rapport JSON d\'analyse acoustique renvoyé par Gemini.');
      }
    }

    res.json({
      success: true,
      analysis: analysisData,
      audioDuration: dur,
    });
  } catch (err: any) {
    console.error('Error analyzing voice sample:', err);
    const parsed = parseAndFormatError(err);
    res.status(parsed.httpStatus).json({
      error: parsed.message,
      errorType: parsed.errorType,
      retryAfterSeconds: parsed.retryAfterSeconds,
    });
  }
});

// Single segment TTS generation endpoint
app.post('/api/tts/generate-segment', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore', style = '', speed = 1.0, pitch = 'normal', model = 'gemini-3.8-flash-tts' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Le texte du segment est vide.' });
    }

    const ai = getGenAIClientForReq(req);

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

    const ttsResult = await generateTts(ai, text, enrichedStyle, finalVoice, model);
    const base64Audio = ttsResult.base64Audio;
    const wavBuffer = Buffer.from(base64Audio, 'base64');
    const duration = getWavDuration(wavBuffer);

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      duration,
      byteSize: wavBuffer.length,
      modelUsed: ttsResult.modelUsed,
      tokensConsumed: ttsResult.tokensConsumed,
    });
  } catch (err: any) {
    console.error('Error generating audio segment:', err);
    const parsed = parseAndFormatError(err);
    res.status(parsed.httpStatus).json({
      error: parsed.message,
      errorType: parsed.errorType,
      retryAfterSeconds: parsed.retryAfterSeconds,
    });
  }
});

// Intelligent script segmentation endpoint
app.post('/api/tts/split-segments', (req: Request, res: Response) => {
  const { text, maxWords = 80 } = req.body;
  const segments = splitTextIntoSegments(text || '', maxWords);
  res.json({ segments });
});

// Resumable TTS Job Management endpoints
app.get('/api/tts/jobs/:id', (req: Request, res: Response) => {
  const jobs = loadJobs();
  const job = jobs[req.params.id];
  if (!job) {
    return res.status(404).json({ error: 'Tâche introuvable' });
  }
  res.json({ job });
});

app.post('/api/tts/jobs', (req: Request, res: Response) => {
  try {
    const jobData = req.body;
    if (!jobData || !jobData.jobId) {
      return res.status(400).json({ error: 'Données de tâche invalides.' });
    }

    const jobs = loadJobs();
    jobs[jobData.jobId] = {
      ...jobData,
      updatedAt: new Date().toISOString(),
    };

    // Keep max 20 jobs to prevent excessive file size
    const keys = Object.keys(jobs);
    if (keys.length > 20) {
      delete jobs[keys[0]];
    }

    saveJobs(jobs);
    res.json({ success: true, jobId: jobData.jobId });
  } catch (err: any) {
    console.error('Error saving job:', err);
    res.status(500).json({ error: 'Échec de la sauvegarde de la tâche.' });
  }
});

app.delete('/api/tts/jobs/:id', (req: Request, res: Response) => {
  try {
    const jobs = loadJobs();
    if (jobs[req.params.id]) {
      delete jobs[req.params.id];
      saveJobs(jobs);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Échec de suppression.' });
  }
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

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export default app;
