export type VoicePreset =
  | 'Wise_Woman'
  | 'Friendly_Person'
  | 'Inspirational_girl'
  | 'Deep_Voice_Man'
  | 'Calm_Woman'
  | 'Casual_Guy'
  | 'Lively_Girl'
  | 'Patient_Man'
  | 'Young_Knight'
  | 'Determined_Man'
  | 'Lovely_Girl'
  | 'Decent_Boy'
  | 'Imposing_Manner'
  | 'Elegant_Man'
  | 'Abbess'
  | 'Sweet_Girl_2'
  | 'Exuberant_Girl';

export const VOICE_PRESETS: VoicePreset[] = [
  'Wise_Woman',
  'Friendly_Person',
  'Inspirational_girl',
  'Deep_Voice_Man',
  'Calm_Woman',
  'Casual_Guy',
  'Lively_Girl',
  'Patient_Man',
  'Young_Knight',
  'Determined_Man',
  'Lovely_Girl',
  'Decent_Boy',
  'Imposing_Manner',
  'Elegant_Man',
  'Abbess',
  'Sweet_Girl_2',
  'Exuberant_Girl',
];

export type LipsyncQuality = 'fast' | 'hd';

export interface Avatar {
  id: string;
  userId: string;
  name: string;
  baseUrl: string;
  basePath: string;
  baseKind: 'image' | 'video';
  baseMime: string;
  posterUrl?: string | null;
  idleVideoUrl?: string | null;
  idleVideoPath?: string | null;
  talkingVideoUrl?: string | null;
  talkingVideoPath?: string | null;
  voicePreset: VoicePreset;
  voiceProvider: string;
  voiceProviderId: string;
  voiceSpeed?: number | null;
  voicePitch?: number | null;
  lipsyncQuality: LipsyncQuality;
  persona?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'pending' | 'audio_ready' | 'rendering' | 'done' | 'error';

export interface Message {
  id: string;
  avatarId: string;
  userId: string;
  role: MessageRole;
  text: string;
  status: MessageStatus;
  jobId?: string | null;
  videoUrl?: string | null;
  videoPath?: string | null;
  durationMs?: number | null;
  createdAt: string;
  updatedAt?: string;
}

export interface VendorStatus {
  supabase: boolean;
  novita: boolean;
  minimax: boolean;
  gooey: boolean;
}

export interface AppSettings {
  cleanMode: boolean;
  skipShortReplies: boolean;
}

export interface PersistedStore {
  avatars: Avatar[];
  messages: Record<string, Message[]>;
  settings: AppSettings;
  version: number;
}
