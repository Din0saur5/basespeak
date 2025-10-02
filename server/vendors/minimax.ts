import { Buffer } from 'node:buffer';
import { ENV } from '../env';
import { synthesizeFallbackSpeech } from '../utils/audio';
import { logError } from '../utils/logger';

interface MinimaxOptions {
  voicePreset: string;
  speed?: number | null;
  pitch?: number | null;
}

interface SpeechResult {
  audioBase64: string;
  mime: string;
  durationMs: number;
}

interface NovitaSpeechResponse {
  audio?: string;
  data?: { audio?: string; duration_ms?: number };
}

const DEFAULT_SPEED = 1.0;
const DEFAULT_VOLUME = 1.0;
const DEFAULT_PITCH = 0;

function hexToBase64(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64');
}

export async function synthesizeSpeech(text: string, options: MinimaxOptions): Promise<SpeechResult> {
  if (!ENV.NOVITA_KEY) {
    const fallback = synthesizeFallbackSpeech(text);
    return {
      audioBase64: fallback.base64,
      mime: fallback.mime,
      durationMs: fallback.durationMs,
    };
  }

  try {
    const response = await fetch(ENV.NOVITA_SPEECH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ENV.NOVITA_KEY}`,
      },
      body: JSON.stringify({
        text,
        voice_setting: {
          voice_id: options.voicePreset ?? ENV.NOVITA_SPEECH_DEFAULT_VOICE,
          speed: options.speed ?? DEFAULT_SPEED,
          vol: DEFAULT_VOLUME,
          pitch: options.pitch ?? DEFAULT_PITCH,
          emotion: 'neutral',
        },
        audio_setting: {
          format: 'mp3',
          sample_rate: 32000,
          bitrate: 128000,
          channel: 1,
        },
        output_format: 'hex',
        stream: false,
      }),
    });

    if (!response.ok) {
      const content = await response.text();
      throw new Error(`Novita speech responded with ${response.status}: ${content}`);
    }

    const payload = (await response.json()) as NovitaSpeechResponse;
    const audioHex = payload?.audio ?? payload?.data?.audio;

    if (typeof audioHex === 'string' && audioHex.length > 0) {
      const audioBase64 = hexToBase64(audioHex);
      return {
        audioBase64,
        mime: 'audio/mpeg',
        durationMs: estimateDuration(text, payload),
      };
    }
  } catch (error) {
    logError('Novita speech synthesis failed', error);
  }

  const fallback = synthesizeFallbackSpeech(text);
  return {
    audioBase64: fallback.base64,
    mime: fallback.mime,
    durationMs: fallback.durationMs,
  };
}

function estimateDuration(text: string, payload: NovitaSpeechResponse): number {
  const durationField = payload?.data?.duration_ms;
  if (typeof durationField === 'number') {
    return durationField;
  }
  // Rough heuristic: ~150 words per minute
  const words = text.trim().split(/\s+/).filter(Boolean).length || 1;
  const minutes = words / 150;
  return Math.max(1000, Math.round(minutes * 60 * 1000));
}
