import lamejs from 'lamejs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

/**
 * Creates a valid RIFF WAV header for 16-bit PCM audio.
 */
export function createWavHeader(dataLength: number, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  // RIFF identifier
  header.write('RIFF', 0);
  // RIFF chunk size (file length - 8)
  header.writeUInt32LE(36 + dataLength, 4);
  // RIFF type
  header.write('WAVE', 8);
  // Format chunk identifier
  header.write('fmt ', 12);
  // Format chunk size (16 for PCM)
  header.writeUInt32LE(16, 16);
  // Sample format (1 = PCM)
  header.writeUInt16LE(1, 20);
  // Channels
  header.writeUInt16LE(numChannels, 22);
  // Sample rate
  header.writeUInt32LE(sampleRate, 24);
  // Byte rate
  header.writeUInt32LE(byteRate, 28);
  // Block align
  header.writeUInt16LE(blockAlign, 32);
  // Bits per sample
  header.writeUInt16LE(bitsPerSample, 34);
  // Data chunk identifier
  header.write('data', 36);
  // Data chunk size
  header.writeUInt32LE(dataLength, 40);

  return header;
}

/**
 * Extracts raw PCM audio data from a WAV buffer.
 */
export function extractPcmFromWav(wavBuffer: Buffer): { pcm: Buffer; sampleRate: number; channels: number } {
  if (wavBuffer.length < 44) {
    return { pcm: wavBuffer, sampleRate: 24000, channels: 1 };
  }

  // Look for 'fmt ' chunk
  let sampleRate = 24000;
  let channels = 1;
  const fmtPos = wavBuffer.indexOf(Buffer.from('fmt '));
  if (fmtPos !== -1 && fmtPos + 16 <= wavBuffer.length) {
    channels = wavBuffer.readUInt16LE(fmtPos + 10);
    sampleRate = wavBuffer.readUInt32LE(fmtPos + 12);
  }

  // Look for 'data' chunk
  const dataPos = wavBuffer.indexOf(Buffer.from('data'));
  if (dataPos !== -1 && dataPos + 8 <= wavBuffer.length) {
    const dataSize = wavBuffer.readUInt32LE(dataPos + 4);
    const start = dataPos + 8;
    const end = Math.min(start + dataSize, wavBuffer.length);
    return {
      pcm: wavBuffer.subarray(start, end),
      sampleRate,
      channels,
    };
  }

  // Fallback: strip standard 44-byte header
  return {
    pcm: wavBuffer.subarray(44),
    sampleRate: 24000,
    channels: 1,
  };
}

/**
 * Concatenates multiple WAV buffers into a single seamless WAV.
 */
export function concatenateWavBuffers(wavBuffers: Buffer[]): Buffer {
  if (!wavBuffers || wavBuffers.length === 0) {
    return Buffer.alloc(0);
  }
  if (wavBuffers.length === 1) {
    return wavBuffers[0];
  }

  const pcmChunks: Buffer[] = [];
  let sampleRate = 24000;
  let channels = 1;

  for (const wav of wavBuffers) {
    const extracted = extractPcmFromWav(wav);
    if (extracted.pcm.length > 0) {
      pcmChunks.push(extracted.pcm);
      sampleRate = extracted.sampleRate || sampleRate;
      channels = extracted.channels || channels;
    }
  }

  const totalPcm = Buffer.concat(pcmChunks);
  const header = createWavHeader(totalPcm.length, sampleRate, channels, 16);
  return Buffer.concat([header, totalPcm]);
}

/**
 * Encodes a 16-bit mono/stereo WAV buffer to MP3 format using lamejs (fallback).
 */
export function wavToMp3(wavBuffer: Buffer): Buffer {
  try {
    const { pcm, sampleRate, channels } = extractPcmFromWav(wavBuffer);
    const numSamples = Math.floor(pcm.length / 2);
    const samples = new Int16Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      samples[i] = pcm.readInt16LE(i * 2);
    }

    const kbps = 128;
    const Mp3Encoder = (lamejs as any).Mp3Encoder;
    const mp3enc = new Mp3Encoder(channels, sampleRate, kbps);
    const mp3Chunks: Buffer[] = [];
    const sampleBlockSize = 1152;

    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const sampleChunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3enc.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) {
        mp3Chunks.push(Buffer.from(mp3buf.buffer, mp3buf.byteOffset, mp3buf.length));
      }
    }

    const endBuf = mp3enc.flush();
    if (endBuf.length > 0) {
      mp3Chunks.push(Buffer.from(endBuf.buffer, endBuf.byteOffset, endBuf.length));
    }

    return Buffer.concat(mp3Chunks);
  } catch (error) {
    console.error('Error converting WAV to MP3:', error);
    return wavBuffer;
  }
}

/**
 * High quality audio conversion using ffmpeg for WAV, MP3 and OGG.
 */
export async function convertAudioWithFfmpeg(
  wavBuffer: Buffer,
  targetFormat: 'mp3' | 'wav' | 'ogg'
): Promise<Buffer> {
  if (targetFormat === 'wav') {
    return wavBuffer;
  }

  const tmpDir = os.tmpdir();
  const id = `marius_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inputPath = path.join(tmpDir, `${id}.wav`);
  const outputPath = path.join(tmpDir, `${id}.${targetFormat}`);

  await fs.promises.writeFile(inputPath, wavBuffer);

  try {
    let args: string[] = [];
    if (targetFormat === 'mp3') {
      args = ['-y', '-i', inputPath, '-codec:a', 'libmp3lame', '-b:a', '192k', outputPath];
    } else if (targetFormat === 'ogg') {
      args = ['-y', '-i', inputPath, '-codec:a', 'libvorbis', '-q:a', '4', outputPath];
    }

    await execFileAsync('ffmpeg', args);
    const resultBuffer = await fs.promises.readFile(outputPath);
    return resultBuffer;
  } catch (err) {
    console.warn(`ffmpeg conversion to ${targetFormat} failed, fallback to native conversion:`, err);
    if (targetFormat === 'mp3') {
      return wavToMp3(wavBuffer);
    }
    return wavBuffer;
  } finally {
    try { await fs.promises.unlink(inputPath); } catch {}
    try { await fs.promises.unlink(outputPath); } catch {}
  }
}

/**
 * Calculates audio duration in seconds from 16-bit PCM length and sample rate.
 */
export function getWavDuration(wavBuffer: Buffer): number {
  const { pcm, sampleRate, channels } = extractPcmFromWav(wavBuffer);
  const bytesPerSample = 2; // 16-bit
  const bytesPerSec = sampleRate * channels * bytesPerSample;
  if (bytesPerSec === 0) return 0;
  return Number((pcm.length / bytesPerSec).toFixed(2));
}

/**
 * Splits text into segments honoring sentence and paragraph boundaries.
 * Max words per segment default: 80 words (roughly 30-40 seconds of speech),
 * perfectly sized for natural prosody, low latency, and zero timeout risk.
 */
export function splitTextIntoSegments(text: string, maxWordsPerSegment = 80): string[] {
  const clean = text.trim();
  if (!clean) return [];

  // Split into paragraphs first
  const paragraphs = clean.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const segments: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    if (words.length <= maxWordsPerSegment) {
      segments.push(para);
    } else {
      // Split paragraph by sentences
      const sentences = para.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [para];
      let currentSegment = '';
      let currentWordCount = 0;

      for (const sentence of sentences) {
        const sentenceWords = sentence.trim().split(/\s+/).length;
        if (currentWordCount + sentenceWords <= maxWordsPerSegment) {
          currentSegment += (currentSegment ? ' ' : '') + sentence.trim();
          currentWordCount += sentenceWords;
        } else {
          if (currentSegment) {
            segments.push(currentSegment);
          }
          currentSegment = sentence.trim();
          currentWordCount = sentenceWords;
        }
      }

      if (currentSegment) {
        segments.push(currentSegment);
      }
    }
  }

  return segments.length > 0 ? segments : [clean];
}
