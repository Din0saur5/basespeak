import { ENV } from '../env';
import { logError } from '../utils/logger';

type BaseKind = 'image' | 'video';

interface GooeySubmitOptions {
  baseUrl: string;
  baseKind: BaseKind;
  audioBase64: string;
  audioMime: string;
  quality: 'fast' | 'hd';
}

export interface GooeySubmitResult {
  jobId: string | null;
  mp4Url?: string | null;
}

export interface GooeyJobStatus {
  status: 'queued' | 'running' | 'done' | 'error';
  mp4Url?: string | null;
  error?: string;
}

export async function submitGooeyJob(options: GooeySubmitOptions): Promise<GooeySubmitResult> {
  if (!ENV.GOOEY_KEY) {
    return { jobId: null, mp4Url: null };
  }

  try {
    const payload: Record<string, unknown> = {
      audio_base64: options.audioBase64,
      audio_mime_type: options.audioMime,
      quality: options.quality,
    };

    if (options.baseKind === 'image') {
      payload.face_image_url = options.baseUrl;
    } else {
      payload.input_video_url = options.baseUrl;
    }

    const response = await fetch(`${ENV.GOOEY_API_URL.replace(/\/$/, '')}/lipsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ENV.GOOEY_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const content = await response.text();
      throw new Error(`Gooey responded with ${response.status}: ${content}`);
    }

    const data = await response.json();
    const jobId = data?.job_id ?? data?.id ?? null;
    const mp4Url = data?.mp4_url ?? data?.mp4Url ?? null;

    return {
      jobId,
      mp4Url,
    };
  } catch (error) {
    logError('Gooey lipsync submission failed', error);
    return { jobId: null, mp4Url: null };
  }
}

export async function fetchGooeyJob(jobId: string): Promise<GooeyJobStatus> {
  if (!ENV.GOOEY_KEY) {
    return { status: 'error', error: 'GOOEY_KEY missing' };
  }

  try {
    const response = await fetch(`${ENV.GOOEY_API_URL.replace(/\/$/, '')}/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${ENV.GOOEY_KEY}`,
      },
    });

    if (!response.ok) {
      const content = await response.text();
      throw new Error(`Gooey job fetch failed ${response.status}: ${content}`);
    }

    const data = await response.json();
    const rawStatus = String(data?.status ?? data?.state ?? 'queued').toLowerCase();
    const statusMap: Record<string, GooeyJobStatus['status']> = {
      queued: 'queued',
      pending: 'queued',
      processing: 'running',
      running: 'running',
      done: 'done',
      completed: 'done',
      success: 'done',
      error: 'error',
      failed: 'error',
    };
    const status = statusMap[rawStatus] ?? 'queued';
    return {
      status,
      mp4Url: data?.mp4_url ?? data?.result_url ?? null,
      error: data?.error ?? data?.message,
    };
  } catch (error) {
    logError('Gooey job polling failed', error);
    return { status: 'error', error: 'Failed to reach Gooey' };
  }
}
