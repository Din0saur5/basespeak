import { supabase } from '../supabase';
import { MessageRow } from '../types';
import { logError } from '../utils/logger';
import { ENV } from '../env';
import { getPublicUrl } from './storage';

export async function insertMessage(row: Partial<MessageRow>): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .insert(row)
    .select()
    .single();

  if (error) {
    logError('Failed to insert message', error);
    throw error;
  }

  return data as MessageRow;
}

export async function listMessages(userId: string, avatarId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select()
    .eq('user_id', userId)
    .eq('avatar_id', avatarId)
    .order('created_at', { ascending: true });

  if (error) {
    logError('Failed to load messages', error);
    throw error;
  }

  return (data ?? []) as MessageRow[];
}

export async function findMessageByJobId(jobId: string): Promise<MessageRow | null> {
  const { data, error } = await supabase
    .from('messages')
    .select()
    .eq('job_id', jobId)
    .single();

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') {
      return null;
    }
    logError('Failed to find message by job id', error);
    throw error;
  }

  return data as MessageRow;
}

export async function updateMessage(id: string, patch: Partial<MessageRow>): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logError('Failed to update message', error);
    throw error;
  }

  return data as MessageRow;
}

export function mapMessageRow(row: MessageRow) {
  const videoUrl = row.video_url ?? getPublicUrl(ENV.SUPABASE_VIDEO_BUCKET, row.video_path ?? undefined);
  return {
    id: row.id,
    avatarId: row.avatar_id,
    userId: row.user_id,
    role: row.role,
    text: row.text,
    status: row.status,
    jobId: row.job_id,
    videoPath: row.video_path,
    videoUrl,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
