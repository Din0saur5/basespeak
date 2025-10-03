import { ENV } from '../env';
import { logError } from '../utils/logger';

type BaseKind = 'image' | 'video';

interface GooeySubmitOptions {
  baseUrl: string;
  baseKind: BaseKind;
  audioUrl: string;
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
      input_face: options.baseUrl,
      input_audio: options.audioUrl,
      selected_model: 'Wav2Lip',
      face_padding_top: 0,
      face_padding_bottom: 18,
      face_padding_left: 0,
      face_padding_right: 0,
    };

    if (options.baseKind === 'image') {
      payload.face_padding_bottom = 0;
    }

    console.log('[Gooey] submit request', payload);

    const response = await fetch(`${ENV.GOOEY_API_URL.replace(/\/$/, '')}/Lipsync/async/`, {
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

    console.log('[Gooey] submit status', response.status);
    const location = response.headers.get('Location');
    if (!location) {
      throw new Error('Gooey response missing Location header');
    }

    let jobId = location;
    console.log('[Gooey] submit location', location);
    try {
      const url = new URL(location);
      const runId = url.searchParams.get('run_id');
      if (runId) {
        jobId = runId;
      }
    } catch (parseError) {
      logError('Failed to parse Gooey Location header', parseError);
    }

    return {
      jobId,
      mp4Url: null,
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
    const base = ENV.GOOEY_API_URL.replace(/\/$/, '');
    const url = jobId.startsWith('http') ? jobId : `${base}/Lipsync/status/?run_id=${encodeURIComponent(jobId)}`;
    console.log('[Gooey] polling url', url);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${ENV.GOOEY_KEY}`,
      },
    });

    if (!response.ok) {
      const content = await response.text();
      throw new Error(`Gooey job fetch failed ${response.status}: ${content}`);
    }

    const data = await response.json();
    console.log('[Gooey] polling status response', data);
    const rawStatus = String(data?.status ?? 'pending').toLowerCase();
    const statusMap: Record<string, GooeyJobStatus['status']> = {
      pending: 'queued',
      queued: 'queued',
      processing: 'running',
      running: 'running',
      working: 'running',
      completed: 'done',
      done: 'done',
      success: 'done',
      failed: 'error',
      error: 'error',
    };
    const status = statusMap[rawStatus] ?? 'queued';
    const outputUrl =
      data?.output_video ??
      data?.result_url ??
      data?.output?.output_video ??
      data?.files?.output_video ??
      null;
    return {
      status,
      mp4Url: outputUrl,
      error: data?.error ?? data?.message,
    };
  } catch (error) {
    logError('Gooey job polling failed', error);
    return { status: 'error', error: 'Failed to reach Gooey' };
  }
}
