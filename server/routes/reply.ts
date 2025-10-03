import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { generateNovitaReply } from '../vendors/novita';
import { synthesizeSpeech } from '../vendors/minimax';
import { submitGooeyJob, fetchGooeyJob } from '../vendors/gooey';
import { getAvatar, mapAvatarRow } from '../services/avatars';
import { insertMessage } from '../services/messages';
import { ReplyPayload } from '../types';
import { logError } from '../utils/logger';
import { ENV } from '../env';
import { getPublicUrl, uploadVideoAsset } from '../services/storage';

const MAX_ASSISTANT_CHARS = 280;
const WORDS_PER_SEGMENT = 20;
const GOOEY_MAX_POLLS = 30;
const GOOEY_POLL_INTERVAL_MS = 2000;

function normalizeText(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function chunkTextForLipsync(text: string, wordsPerChunk = WORDS_PER_SEGMENT): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  return chunks;
}

async function waitForGooey(jobId: string): Promise<string | null> {
  for (let attempt = 0; attempt < GOOEY_MAX_POLLS; attempt += 1) {
    const status = await fetchGooeyJob(jobId);
    console.log('[Reply] gooey poll', jobId, status.status);
    if (status.status === 'done' && status.mp4Url) {
      return status.mp4Url;
    }
    if (status.status === 'error') {
      logError('Gooey job failed', status.error);
      return null;
    }
    await new Promise((resolve) => setTimeout(resolve, GOOEY_POLL_INTERVAL_MS));
  }
  logError('Gooey job timed out', new Error(jobId));
  return null;
}

export async function replyHandler(req: Request, res: Response) {
  try {
    console.log('[Reply] incoming request');
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
    console.log('[Reply] avatar', avatar.id);
    const userMessageId = randomUUID();
    const assistantMessageId = randomUUID();

    await insertMessage({
      id: userMessageId,
      user_id: userId,
      avatar_id: avatarRow.id,
      role: 'user',
      text: userText,
      status: 'done',
      video_urls: [],
    });

    const cleanMode = payload.settings?.cleanMode ?? (avatarRow.safe_mode ?? ENV.CLEAN_MODE_DEFAULT);
    const replyTextRaw = await generateNovitaReply({
      userText,
      persona: avatarRow.persona,
      cleanMode,
    });

    const replyText = truncate(replyTextRaw, MAX_ASSISTANT_CHARS);
    console.log('[Reply] novita reply', replyText);

    const fallbackSpeech = await synthesizeSpeech(replyText, {
      voicePreset: avatarRow.voice_preset,
      speed: avatarRow.voice_speed,
      pitch: avatarRow.voice_pitch,
    });

    const shouldSkipLipsync = Boolean(payload.settings?.skipShortReplies) && replyText.length < 12;
    const baseUrl = avatar.baseUrl || getPublicUrl(ENV.SUPABASE_BASE_BUCKET, avatarRow.base_path) || '';
    const talkingUrl =
      avatarRow.base_kind === 'video'
        ? avatar.talkingVideoUrl || avatar.baseUrl || baseUrl
        : baseUrl;

    const videoUrls: string[] = [];

    if (!shouldSkipLipsync && talkingUrl) {
      const segments = chunkTextForLipsync(replyText);
      console.log('[Reply] generating segments', segments.length);

      for (let index = 0; index < segments.length; index += 1) {
        const segmentText = segments[index];
        try {
          const segmentSpeech = await synthesizeSpeech(segmentText, {
            voicePreset: avatarRow.voice_preset,
            speed: avatarRow.voice_speed,
            pitch: avatarRow.voice_pitch,
          });

          const mime = segmentSpeech.mime ?? 'audio/mpeg';
          const extension = mime === 'audio/wav' || mime === 'audio/x-wav' ? 'wav' : 'mp3';
          const audioBuffer = Buffer.from(segmentSpeech.audioBase64, 'base64');
          const audioPath = `${userId}/audio/${assistantMessageId}-${index}.${extension}`;
          const audioUpload = await uploadVideoAsset(audioPath, audioBuffer, mime);
          const chunkAudioUrl = audioUpload.publicUrl;
          if (!chunkAudioUrl) {
            logError('Gooey chunk audio upload missing URL', new Error(audioPath));
            continue;
          }

          console.log('[Reply] gooey submission', { talkingUrl, chunkAudioUrl, index });
          const submission = await submitGooeyJob({
            baseUrl: talkingUrl,
            baseKind: avatarRow.base_kind,
            audioUrl: chunkAudioUrl,
            quality: payload.lipsyncQuality ?? avatarRow.lipsync_quality ?? 'fast',
          });

          let clipUrl = submission.mp4Url ?? null;
          if (!clipUrl && submission.jobId) {
            clipUrl = await waitForGooey(submission.jobId);
          }

          if (clipUrl) {
            console.log('[Reply] gooey clip ready', clipUrl);
            videoUrls.push(clipUrl);
          } else {
            logError('Gooey clip missing URL', new Error(`segment ${index}`));
          }
        } catch (segmentError) {
          logError('Failed to process lipsync segment', segmentError);
        }
      }
    }

    const status = videoUrls.length ? 'done' : 'audio_ready';

    await insertMessage({
      id: assistantMessageId,
      user_id: userId,
      avatar_id: avatarRow.id,
      role: 'assistant',
      text: replyText,
      status,
      job_id: null,
      video_urls: videoUrls,
      duration_ms: fallbackSpeech.durationMs,
    });

    const responsePayload = {
      replyText,
      audioB64: fallbackSpeech.audioBase64,
      mime: fallbackSpeech.mime,
      messageId: assistantMessageId,
      videoUrls,
    };
    console.log('[Reply] response payload', responsePayload);
    return res.json(responsePayload);
  } catch (error) {
    logError('Reply handler failed', error);
    return res.status(500).json({ error: 'Failed to process reply' });
  }
}
