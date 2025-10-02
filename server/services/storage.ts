import { supabase } from '../supabase';
import { ENV } from '../env';
import { logError } from '../utils/logger';

function assertBucketResponse<T>(result: { data: T | null; error: unknown }) {
  if (result.error) {
    throw result.error;
  }
  if (!result.data) {
    throw new Error('Storage returned empty data');
  }
  return result.data;
}

export async function uploadBaseAsset(path: string, fileBuffer: Buffer, mimeType: string) {
  const { data, error } = await supabase.storage
    .from(ENV.SUPABASE_BASE_BUCKET)
    .upload(path, fileBuffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    logError('Upload to bases bucket failed', error);
    throw error;
  }

  return {
    path: data.path,
    publicUrl: getPublicUrl(ENV.SUPABASE_BASE_BUCKET, data.path),
  };
}

export async function uploadVideoAsset(path: string, fileBuffer: Buffer, mimeType: string) {
  const { data, error } = await supabase.storage
    .from(ENV.SUPABASE_VIDEO_BUCKET)
    .upload(path, fileBuffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    logError('Upload to videos bucket failed', error);
    throw error;
  }

  return {
    path: data.path,
    publicUrl: getPublicUrl(ENV.SUPABASE_VIDEO_BUCKET, data.path),
  };
}

export function getPublicUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  const result = supabase.storage.from(bucket).getPublicUrl(path);
  return result.data.publicUrl ?? null;
}
