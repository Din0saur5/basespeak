import { AppSettings, Avatar, LipsyncQuality, Message, VendorStatus, VoicePreset } from '~/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

interface RequestOptions {
  userId?: string;
}

interface UploadBasePayload {
  uri: string;
  name: string;
  fileName: string;
  mimeType: string;
  voicePreset: VoicePreset;
  persona?: string;
  lipsyncQuality: LipsyncQuality;
  idle?: {
    uri: string;
    fileName: string;
    mimeType: string;
  } | null;
  talking?: {
    uri: string;
    fileName: string;
    mimeType: string;
  } | null;
}

export interface UploadBaseResponse {
  avatar: Avatar;
}

export interface ReplyResponse {
  replyText: string;
  audioB64: string;
  mime: string;
  jobId?: string | null;
  messageId: string;
}

export interface JobStatusResponse {
  status: 'queued' | 'running' | 'done' | 'error';
  mp4Url?: string | null;
  messageId?: string;
  error?: string;
}

async function request<T>(path: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (options.userId) {
    headers['x-user-id'] = options.userId;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export async function uploadBase(payload: UploadBasePayload, userId: string): Promise<UploadBaseResponse> {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('voicePreset', payload.voicePreset);
  if (payload.persona) {
    formData.append('persona', payload.persona);
  }
  formData.append('lipsyncQuality', payload.lipsyncQuality);

  formData.append('file', {
    uri: payload.uri,
    name: payload.fileName,
    type: payload.mimeType,
  } as unknown as Blob);

  if (payload.idle) {
    formData.append('idleFile', {
      uri: payload.idle.uri,
      name: payload.idle.fileName,
      type: payload.idle.mimeType,
    } as unknown as Blob);
  }

  if (payload.talking) {
    formData.append('talkingFile', {
      uri: payload.talking.uri,
      name: payload.talking.fileName,
      type: payload.talking.mimeType,
    } as unknown as Blob);
  }

  return request<UploadBaseResponse>(
    '/upload-base',
    {
      method: 'POST',
      body: formData,
    },
    { userId },
  );
}

interface ReplyPayload {
  avatarId: string;
  userText: string;
  lipsyncQuality: LipsyncQuality;
  settings: AppSettings;
}

export async function sendReply(payload: ReplyPayload, userId: string): Promise<ReplyResponse> {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return request<ReplyResponse>(
    '/reply',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    { userId },
  );
}

export async function pollJob(jobId: string, userId?: string): Promise<JobStatusResponse> {
  return request<JobStatusResponse>(`/job/${jobId}`, undefined, { userId });
}

export async function fetchVendorStatus(): Promise<VendorStatus> {
  return request<VendorStatus>('/status');
}

export async function fetchAvatars(userId: string): Promise<Avatar[]> {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return request<Avatar[]>('/avatars', undefined, { userId });
}

export async function fetchMessages(userId: string, avatarId: string): Promise<Message[]> {
  if (!userId) {
    throw new Error('User not authenticated');
  }
  const result = await request<{ messages: Message[] }>(`/avatars/${avatarId}/messages`, undefined, { userId });
  return result.messages;
}
