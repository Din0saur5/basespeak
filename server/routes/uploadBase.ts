import type { Express } from 'express';
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
    console.log('[Upload] received request');
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }

    const files = (req.files as Express.Multer.File[]) ?? [];
    const pickFile = (field: string) => files.find((item) => item.fieldname === field);
    const file = pickFile('file');
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
    console.log('[Upload] stored base', uploadResult.path);

    let idleUpload: { path: string; publicUrl: string | null } | undefined;
    let talkingUpload: { path: string; publicUrl: string | null } | undefined;

    if (baseKind === 'video') {
      const idleSource = pickFile('idleFile') ?? file;
      const idleMime = idleSource.mimetype ?? mimeType;
      const idleExt = getExtensionFromMime(idleMime);
      const idlePath = `${userId}/${randomUUID()}-idle.${idleExt}`;
      idleUpload = await uploadBaseAsset(idlePath, idleSource.buffer, idleMime);

      const talkingSource = pickFile('talkingFile') ?? file;
      const talkingMime = talkingSource.mimetype ?? mimeType;
      const talkingExt = getExtensionFromMime(talkingMime);
      const talkingPath = `${userId}/${randomUUID()}-talking.${talkingExt}`;
      talkingUpload = await uploadBaseAsset(talkingPath, talkingSource.buffer, talkingMime);
      console.log('[Upload] stored idle/talking', { idle: idleUpload?.path, talking: talkingUpload?.path });
    }

    const avatarRow = await insertAvatar({
      user_id: userId,
      name: payload.name,
      base_path: uploadResult.path,
      base_kind: baseKind,
      base_mime: mimeType,
      idle_video_path: idleUpload?.path ?? null,
      idle_video_url: idleUpload?.publicUrl ?? null,
      talking_video_path: talkingUpload?.path ?? null,
      talking_video_url: talkingUpload?.publicUrl ?? null,
      voice_preset: payload.voicePreset,
      voice_provider: resolveVoiceProvider(),
      voice_provider_id: resolveVoiceProviderId(payload.voicePreset),
      lipsync_quality: payload.lipsyncQuality ?? 'fast',
      persona: payload.persona ?? null,
    });

    console.log('[Upload] avatar created', avatarRow.id);

    const avatar = mapAvatarRow(avatarRow);
    avatar.baseUrl = uploadResult.publicUrl ?? avatar.baseUrl;
    if (idleUpload?.publicUrl) {
      avatar.idleVideoUrl = idleUpload.publicUrl;
    }
    if (talkingUpload?.publicUrl) {
      avatar.talkingVideoUrl = talkingUpload.publicUrl;
    }

    return res.json({ avatar });
  } catch (error) {
    logError('Upload base handler failed', error);
    return res.status(500).json({ error: 'Failed to upload base' });
  }
}
