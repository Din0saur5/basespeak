import OpenAI from 'openai';
import { ENV } from '../env';
import { logError } from '../utils/logger';

interface NovitaReplyOptions {
  userText: string;
  persona?: string | null;
  cleanMode?: boolean;
}

function basicClean(text: string): string {
  if (!text) {
    return text;
  }
  const disallowed = /(shit|fuck|damn|bitch)/gi;
  return text.replace(disallowed, '***');
}

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: ENV.NOVITA_KEY,
      baseURL: ENV.NOVITA_OPENAI_BASE,
    });
  }
  return openaiClient;
}

export async function generateNovitaReply({
  userText,
  persona,
  cleanMode,
}: NovitaReplyOptions): Promise<string> {
  const prompt = cleanMode ? basicClean(userText) : userText;
  if (!ENV.NOVITA_KEY) {
    return fallbackReply(prompt, persona ?? undefined);
  }

  try {
    const trimmedPersona = persona?.trim();
    const systemPrompt = trimmedPersona
      ? ` your personality is described as: ${trimmedPersona}\nKeep replies conversational and under two short sentences. You are NOT an AI language model you are the persona above and all your responses should reflect that.
      you are encouraged to make things up about your character like what you did that day or what you're thinking about to keep the convesation going.`
      : 'You are a friendly avatar. Keep replies conversational and under two short sentences.';

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: ENV.NOVITA_LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 320,
      temperature: 0.75,
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim().length > 0) {
      return content.trim();
    }
  } catch (error) {
    logError('Novita LLM call failed', error);
  }

  return fallbackReply(prompt, persona ?? undefined);
}

function fallbackReply(userText: string, persona?: string) {
  const base = `I heard: "${userText}".`;
  if (!persona) {
    return `${base} Let's keep the conversation going!`;
  }
  return `${persona.replace(/\s+/g, ' ').slice(0, 120)} — ${base}`;
}
