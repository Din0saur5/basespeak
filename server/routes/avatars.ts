import type { Express } from 'express';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  listAvatars,
  mapAvatarRow,
  getAvatar,
  updateAvatar,
  resolveVoiceProvider,
  resolveVoiceProviderId,
} from '../services/avatars';
import { listMessages, mapMessageRow } from '../services/messages';
import { uploadBaseAsset } from '../services/storage';
import { logError } from '../utils/logger';
import { getExtensionFromMime, inferBaseKind } from '../utils/mime';
import { AvatarRow, UpdateAvatarPayload } from '../types';

const hasOwn = Object.prototype.hasOwnProperty;

function parseUpdatePayload(body: Request['body']): UpdateAvatarPayload {
  const payload: UpdateAvatarPayload = {};

  if (hasOwn.call(body, 'name')) {
    const value = String(body.name ?? '').trim();
    payload.name = value;
  }

  if (hasOwn.call(body, 'voicePreset')) {
    const value = String(body.voicePreset ?? '').trim();
    payload.voicePreset = value || undefined;
  }

  if (hasOwn.call(body, 'persona')) {
    const value = String(body.persona ?? '').trim();
    payload.persona = value ? value : null;
  }

  if (hasOwn.call(body, 'lipsyncQuality')) {
    payload.lipsyncQuality = body.lipsyncQuality === 'hd' ? 'hd' : 'fast';
  }

  return payload;
}

export async function avatarsHandler(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }
    const rows = await listAvatars(userId);
    const avatars = rows.map(mapAvatarRow);
    return res.json(avatars);
  } catch (error) {
    logError('Failed to list avatars', error);
    return res.status(500).json({ error: 'Failed to list avatars' });
  }
}

export async function updateAvatarHandler(req: Request, res: Response) {
  try {
    const userId = req.userId;
    const { avatarId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }

    if (!avatarId) {
      return res.status(400).json({ error: 'Missing avatar id' });
    }

    const existing = await getAvatar(userId, avatarId);
    if (!existing) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    const payload = parseUpdatePayload(req.body);

    if (payload.name !== undefined && !payload.name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (payload.voicePreset !== undefined && !payload.voicePreset) {
      return res.status(400).json({ error: 'Voice preset is required' });
    }

    const files = (req.files as Express.Multer.File[]) ?? [];
    const pickFile = (field: string) => files.find((item) => item.fieldname === field);

    const baseFile = pickFile('file');
    const idleFile = pickFile('idleFile');
    const talkingFile = pickFile('talkingFile');

    const patch: Partial<AvatarRow> = {};

    if (payload.name !== undefined) {
      patch.name = payload.name;
    }

    if (payload.persona !== undefined) {
      patch.persona = payload.persona;
    }

    if (payload.lipsyncQuality !== undefined) {
      patch.lipsync_quality = payload.lipsyncQuality;
    }

    if (payload.voicePreset !== undefined) {
      patch.voice_preset = payload.voicePreset;
      patch.voice_provider = resolveVoiceProvider();
      patch.voice_provider_id = resolveVoiceProviderId(payload.voicePreset);
    }

    let effectiveBaseKind: AvatarRow['base_kind'] = existing.base_kind;
    let baseUpload: { path: string; publicUrl: string | null } | undefined;

    if (baseFile) {
      const mimeType = baseFile.mimetype;
      const inferredKind = inferBaseKind(mimeType);
      if (!inferredKind) {
        return res.status(400).json({ error: `Unsupported file mime type: ${mimeType}` });
      }
      effectiveBaseKind = inferredKind;
      const extension = getExtensionFromMime(mimeType);
      const basePath = `${userId}/${randomUUID()}.${extension}`;
      baseUpload = await uploadBaseAsset(basePath, baseFile.buffer, mimeType);
      patch.base_path = baseUpload.path;
      patch.base_mime = mimeType;
      patch.base_kind = inferredKind;

      if (inferredKind === 'image') {
        patch.idle_video_path = null;
        patch.idle_video_url = null;
        patch.talking_video_path = null;
        patch.talking_video_url = null;
      }
    }

    if (idleFile) {
      if (effectiveBaseKind !== 'video') {
        return res.status(400).json({ error: 'Idle clip requires a video base' });
      }
      const idleMime = idleFile.mimetype;
      if (inferBaseKind(idleMime) !== 'video') {
        return res.status(400).json({ error: `Idle clip must be a video. Received ${idleMime}` });
      }
      const idlePath = `${userId}/${randomUUID()}-idle.${getExtensionFromMime(idleMime)}`;
      const idleUpload = await uploadBaseAsset(idlePath, idleFile.buffer, idleMime);
      patch.idle_video_path = idleUpload.path;
      patch.idle_video_url = idleUpload.publicUrl ?? null;
    } else if (baseUpload && effectiveBaseKind === 'video') {
      patch.idle_video_path = baseUpload.path;
      patch.idle_video_url = baseUpload.publicUrl ?? null;
    }

    if (talkingFile) {
      if (effectiveBaseKind !== 'video') {
        return res.status(400).json({ error: 'Talking clip requires a video base' });
      }
      const talkingMime = talkingFile.mimetype;
      if (inferBaseKind(talkingMime) !== 'video') {
        return res.status(400).json({ error: `Talking clip must be a video. Received ${talkingMime}` });
      }
      const talkingPath = `${userId}/${randomUUID()}-talking.${getExtensionFromMime(talkingMime)}`;
      const talkingUpload = await uploadBaseAsset(talkingPath, talkingFile.buffer, talkingMime);
      patch.talking_video_path = talkingUpload.path;
      patch.talking_video_url = talkingUpload.publicUrl ?? null;
    } else if (baseUpload && effectiveBaseKind === 'video') {
      patch.talking_video_path = baseUpload.path;
      patch.talking_video_url = baseUpload.publicUrl ?? null;
    }

    const updatedRow = await updateAvatar(userId, avatarId, patch);
    const avatar = mapAvatarRow(updatedRow);

    if (baseUpload?.publicUrl) {
      avatar.baseUrl = baseUpload.publicUrl;
    }

    return res.json({ avatar });
  } catch (error) {
    logError('Failed to update avatar', error);
    return res.status(500).json({ error: 'Failed to update avatar' });
  }
}

export async function avatarMessagesHandler(req: Request, res: Response) {
  try {
    const userId = req.userId;
    const { avatarId } = req.params;
    if (!userId) {
      return res.status(401).json({ error: 'Missing user context' });
    }
    if (!avatarId) {
      return res.status(400).json({ error: 'Missing avatar id' });
    }

    const avatar = await getAvatar(userId, avatarId);
    if (!avatar) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    const rows = await listMessages(userId, avatarId);
    const messages = rows.map(mapMessageRow);
    return res.json({ messages });
  } catch (error) {
    logError('Failed to load avatar messages', error);
    return res.status(500).json({ error: 'Failed to load messages' });
  }
}
