import { Request, Response } from 'express';
import { fetchGooeyJob } from '../vendors/gooey';
import { findMessageByJobId, updateMessage } from '../services/messages';
import { uploadVideoAsset } from '../services/storage';
import { logError } from '../utils/logger';

async function downloadAsBuffer(url: string): Promise<{ buffer: Buffer; contentType: string | undefined }> {
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to download Gooey video ${response.status}: ${text}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get('content-type') ?? undefined;
  return { buffer, contentType };
}

export async function jobStatusHandler(req: Request, res: Response) {
  try {
    const { id: jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ error: 'Missing job id' });
    }

    const message = await findMessageByJobId(jobId);
    if (!message) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (message.status === 'done' && message.video_url) {
      return res.json({ status: 'done', mp4Url: message.video_url, messageId: message.id });
    }

    const gooeyStatus = await fetchGooeyJob(jobId);
    if (gooeyStatus.status === 'error') {
      await updateMessage(message.id, { status: 'error' });
      return res.json({ status: 'error', error: gooeyStatus.error ?? 'Gooey job failed' });
    }

    if (gooeyStatus.status === 'done' && gooeyStatus.mp4Url) {
      try {
        const { buffer, contentType } = await downloadAsBuffer(gooeyStatus.mp4Url);
        const targetPath = `${message.user_id}/${message.id}.mp4`;
        const upload = await uploadVideoAsset(targetPath, buffer, contentType ?? 'video/mp4');
        const updated = await updateMessage(message.id, {
          status: 'done',
          video_path: upload.path,
          video_url: upload.publicUrl ?? gooeyStatus.mp4Url,
        });

        return res.json({
          status: 'done',
          mp4Url: updated.video_url ?? gooeyStatus.mp4Url,
          messageId: message.id,
        });
      } catch (error) {
        logError('Failed to persist Gooey video', error);
        await updateMessage(message.id, { status: 'error' });
        return res.json({ status: 'error', error: 'Failed to persist Gooey video' });
      }
    }

    return res.json({ status: gooeyStatus.status, mp4Url: gooeyStatus.mp4Url ?? null });
  } catch (error) {
    logError('Job status handler failed', error);
    return res.status(500).json({ error: 'Failed to poll job' });
  }
}
