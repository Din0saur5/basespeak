import { Request, Response } from 'express';
import { listAvatars, mapAvatarRow, getAvatar } from '../services/avatars';
import { listMessages, mapMessageRow } from '../services/messages';
import { logError } from '../utils/logger';

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
