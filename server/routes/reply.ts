import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { generateNovitaReply } from '../vendors/novita';
import { synthesizeSpeech } from '../vendors/minimax';
import { submitGooeyJob } from '../vendors/gooey';
import { getAvatar, mapAvatarRow } from '../services/avatars';
import { insertMessage, updateMessage } from '../services/messages';
import { ReplyPayload } from '../types';
import { logError } from '../utils/logger';
import { ENV } from '../env';
import { getPublicUrl } from '../services/storage';

const MAX_ASSISTANT_CHARS = 280;

function normalizeText(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function replyHandler(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }

    const payload = req.body as ReplyPayload;
    if (!payload?.avatarId) {
      return res.status(400).json({ error: 'avatarId is required' });
    }
    if (!payload?.userText?.trim()) {
      return res.status(400).json({ error: 'userText is required' });
    }

    const userText = truncate(normalizeText(payload.userText), MAX_ASSISTANT_CHARS);

    const avatarRow = await getAvatar(userId, payload.avatarId);
    if (!avatarRow) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    const avatar = mapAvatarRow(avatarRow);
    const userMessageId = randomUUID();

    await insertMessage({
      id: userMessageId,
      user_id: userId,
      avatar_id: avatarRow.id,
      role: 'user',
      text: userText,
      status: 'done',
    });

    const cleanMode = payload.settings?.cleanMode ?? (avatarRow.safe_mode ?? ENV.CLEAN_MODE_DEFAULT);
    const replyTextRaw = await generateNovitaReply({
      userText,
      persona: avatarRow.persona,
      cleanMode,
    });

    const replyText = truncate(replyTextRaw, MAX_ASSISTANT_CHARS);

    const speech = await synthesizeSpeech(replyText, {
      voicePreset: avatarRow.voice_preset,
      speed: avatarRow.voice_speed,
      pitch: avatarRow.voice_pitch,
    });

    const shouldSkipLipsync = Boolean(payload.settings?.skipShortReplies) && replyText.length < 12;
    let jobId: string | null = null;
    let mp4Url: string | null = null;

    if (!shouldSkipLipsync) {
      const baseUrl = avatar.baseUrl || getPublicUrl(ENV.SUPABASE_BASE_BUCKET, avatarRow.base_path) || '';
      if (baseUrl) {
        const submission = await submitGooeyJob({
          baseUrl,
          baseKind: avatarRow.base_kind,
          audioBase64: speech.audioBase64,
          audioMime: speech.mime,
          quality: payload.lipsyncQuality ?? avatarRow.lipsync_quality ?? 'fast',
        });
        jobId = submission.jobId;
        mp4Url = submission.mp4Url ?? null;
      }
    }

    const assistantMessageId = randomUUID();
    const status = mp4Url ? 'done' : jobId ? 'rendering' : 'audio_ready';

    const assistantMessage = await insertMessage({
      id: assistantMessageId,
      user_id: userId,
      avatar_id: avatarRow.id,
      role: 'assistant',
      text: replyText,
      status,
      job_id: jobId,
      video_url: mp4Url ?? undefined,
      duration_ms: speech.durationMs,
    });

    if (mp4Url && assistantMessage.status !== 'done') {
      await updateMessage(assistantMessageId, {
        status: 'done',
        video_url: mp4Url,
      });
    }

    return res.json({
      replyText,
      audioB64: speech.audioBase64,
      mime: speech.mime,
      jobId,
      messageId: assistantMessageId,
    });
  } catch (error) {
    logError('Reply handler failed', error);
    return res.status(500).json({ error: 'Failed to process reply' });
  }
}
