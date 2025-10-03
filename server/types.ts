export type LipsyncQuality = 'fast' | 'hd';

export interface AvatarRow {
  id: string;
  user_id: string;
  name: string;
  base_path: string;
  base_kind: 'image' | 'video';
  base_mime: string;
  poster_path?: string | null;
  idle_video_path?: string | null;
  idle_video_url?: string | null;
  talking_video_path?: string | null;
  talking_video_url?: string | null;
  voice_provider: string;
  voice_preset: string;
  voice_provider_id: string;
  voice_speed?: number | null;
  voice_pitch?: number | null;
  lipsync_quality: LipsyncQuality;
  persona?: string | null;
  safe_mode?: boolean | null;
  created_at: string;
  updated_at?: string;
}

export interface MessageRow {
  id: string;
  user_id: string;
  avatar_id: string;
  role: 'user' | 'assistant';
  text: string;
  status: 'pending' | 'audio_ready' | 'rendering' | 'done' | 'error';
  job_id?: string | null;
  video_path?: string | null;
  video_url?: string | null;
  video_urls?: string[] | null;
  duration_ms?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface ReplyPayload {
  avatarId: string;
  userText: string;
  lipsyncQuality?: LipsyncQuality;
  settings?: {
    cleanMode?: boolean;
    skipShortReplies?: boolean;
  };
}

export interface UploadBasePayload {
  name: string;
  voicePreset: string;
  persona?: string;
  lipsyncQuality?: LipsyncQuality;
}
