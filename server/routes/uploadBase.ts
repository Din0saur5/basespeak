import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { uploadBaseAsset } from '../services/storage';
import { insertAvatar, mapAvatarRow, resolveVoiceProvider, resolveVoiceProviderId } from '../services/avatars';
import { UploadBasePayload } from '../types';
import { logError } from '../utils/logger';

function getExtensionFromMime(mime: string) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'video/quicktime') return 'mov';
  return 'bin';
}

function parsePayload(body: Request['body']): UploadBasePayload {
  return {
    name: String(body.name ?? '').trim(),
    voicePreset: String(body.voicePreset ?? '').trim(),
    persona: body.persona ? String(body.persona) : undefined,
    lipsyncQuality: body.lipsyncQuality === 'hd' ? 'hd' : 'fast',
  };
}

export async function uploadBaseHandler(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Missing file upload' });
    }

    const payload = parsePayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!payload.voicePreset) {
      return res.status(400).json({ error: 'Voice preset is required' });
    }

    const mimeType = file.mimetype;
    const baseKind = mimeType.startsWith('video/') ? 'video' : mimeType.startsWith('image/') ? 'image' : null;
    if (!baseKind) {
      return res.status(400).json({ error: `Unsupported file mime type: ${mimeType}` });
    }

    const extension = getExtensionFromMime(mimeType);
    const path = `${userId}/${randomUUID()}.${extension}`;

    const uploadResult = await uploadBaseAsset(path, file.buffer, mimeType);

    const avatarRow = await insertAvatar({
      user_id: userId,
      name: payload.name,
      base_path: uploadResult.path,
      base_kind: baseKind,
      base_mime: mimeType,
      voice_preset: payload.voicePreset,
      voice_provider: resolveVoiceProvider(),
      voice_provider_id: resolveVoiceProviderId(payload.voicePreset),
      lipsync_quality: payload.lipsyncQuality ?? 'fast',
      persona: payload.persona ?? null,
    });

    const avatar = mapAvatarRow(avatarRow);
    avatar.baseUrl = uploadResult.publicUrl ?? avatar.baseUrl;

    return res.json({ avatar });
  } catch (error) {
    logError('Upload base handler failed', error);
    return res.status(500).json({ error: 'Failed to upload base' });
  }
}
