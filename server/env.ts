import 'dotenv/config';

export const ENV = {
  PORT: Number(process.env.PORT ?? process.env.SERVER_PORT ?? 4000),
  SUPABASE_URL: process.env.SUPABASE_URL ?? '',
  SUPABASE_KEY: process.env.SUPABASE_KEY ?? '',
  SUPABASE_BASE_BUCKET: process.env.SUPABASE_BASE_BUCKET ?? 'bases',
  SUPABASE_VIDEO_BUCKET: process.env.SUPABASE_VIDEO_BUCKET ?? 'videos',
  NOVITA_KEY: process.env.NOVITA_KEY ?? '',
  NOVITA_LLM_MODEL: process.env.NOVITA_LLM_MODEL ?? 'meta-llama/llama-3.1-8b-instruct',
  NOVITA_OPENAI_BASE: process.env.NOVITA_OPENAI_BASE ?? 'https://api.novita.ai/openai',
  NOVITA_SPEECH_URL: process.env.NOVITA_SPEECH_URL ?? 'https://api.novita.ai/v3/minimax-speech-2.5-turbo-preview',
  NOVITA_SPEECH_DEFAULT_VOICE: process.env.NOVITA_SPEECH_DEFAULT_VOICE ?? 'Wise_Woman',
  GOOEY_KEY: process.env.GOOEY_KEY ?? '',
  GOOEY_API_URL: process.env.GOOEY_API_URL ?? 'https://api.gooey.ai/v1',
  CLEAN_MODE_DEFAULT: process.env.CLEAN_MODE_DEFAULT === 'false' ? false : true,
};

export function assertEnvVar(value: string, name: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}
