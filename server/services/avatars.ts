import { supabase } from '../supabase';
import { DEFAULT_VOICE_PROVIDER, VOICE_PRESET_TO_PROVIDER_ID } from '../constants';
import { AvatarRow } from '../types';
import { getPublicUrl } from './storage';
import { logError } from '../utils/logger';
import { ENV } from '../env';

export async function insertAvatar(row: Partial<AvatarRow>): Promise<AvatarRow> {
  const { data, error } = await supabase
    .from('avatars')
    .insert(row)
    .select()
    .single();

  if (error) {
    logError('Failed to insert avatar', error);
    throw error;
  }

  return data as AvatarRow;
}

export async function updateAvatar(
  userId: string,
  avatarId: string,
  patch: Partial<AvatarRow>,
): Promise<AvatarRow> {
  const filteredPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );

  if (!Object.keys(filteredPatch).length) {
    const current = await getAvatar(userId, avatarId);
    if (!current) {
      throw new Error('Avatar not found');
    }
    return current;
  }

  const { data, error } = await supabase
    .from('avatars')
    .update(filteredPatch)
    .eq('user_id', userId)
    .eq('id', avatarId)
    .select()
    .single();

  if (error) {
    logError('Failed to update avatar', error);
    throw error;
  }

  return data as AvatarRow;
}

export function mapAvatarRow(row: AvatarRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    basePath: row.base_path,
    baseKind: row.base_kind,
    baseMime: row.base_mime,
    baseUrl: getPublicUrl(ENV.SUPABASE_BASE_BUCKET, row.base_path) ?? '',
    posterUrl: getPublicUrl(ENV.SUPABASE_BASE_BUCKET, row.poster_path ?? undefined),
    idleVideoPath: row.idle_video_path ?? null,
    idleVideoUrl:
      row.idle_video_url ?? getPublicUrl(ENV.SUPABASE_BASE_BUCKET, row.idle_video_path ?? undefined) ?? null,
    talkingVideoPath: row.talking_video_path ?? null,
    talkingVideoUrl:
      row.talking_video_url ?? getPublicUrl(ENV.SUPABASE_BASE_BUCKET, row.talking_video_path ?? undefined) ?? null,
    voicePreset: row.voice_preset,
    voiceProvider: row.voice_provider,
    voiceProviderId: row.voice_provider_id,
    voiceSpeed: row.voice_speed,
    voicePitch: row.voice_pitch,
    lipsyncQuality: row.lipsync_quality,
    persona: row.persona,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAvatar(userId: string, avatarId: string): Promise<AvatarRow | null> {
  const { data, error } = await supabase
    .from('avatars')
    .select()
    .eq('user_id', userId)
    .eq('id', avatarId)
    .single();

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') {
      return null;
    }
    logError('Failed to load avatar', error);
    throw error;
  }

  return data as AvatarRow;
}

export async function listAvatars(userId: string): Promise<AvatarRow[]> {
  const { data, error } = await supabase
    .from('avatars')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logError('Failed to load avatars', error);
    throw error;
  }

  return (data ?? []) as AvatarRow[];
}

export function resolveVoiceProviderId(voicePreset: string) {
  return VOICE_PRESET_TO_PROVIDER_ID[voicePreset] ?? voicePreset;
}

export function resolveVoiceProvider() {
  return DEFAULT_VOICE_PROVIDER;
}
