import { QuotaError } from './limiter';
import { AiNotConfiguredError, type AiConfig, type Call, type CallResult } from './types';

/**
 * The OpenAI `/chat/completions` shape, which OpenRouter, DeepSeek, GLM, Groq,
 * Mistral, xAI, Together, Ollama and most local runners all speak. One adapter
 * covers every one of them; only the base URL and model differ.
 */

type ChatResponse = {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  error?: { message?: string; type?: string; code?: string | number };
};

function endpoint(config: AiConfig, path: string) {
  const base = (config.baseUrl ?? '').replace(/\/+$/, '');
  if (!base) throw new AiNotConfiguredError();
  return `${base}${path}`;
}

function headers(config: AiConfig) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  // Local runners like Ollama accept no key at all.
  if (config.apiKey) h.Authorization = `Bearer ${config.apiKey}`;
  // OpenRouter attributes traffic with these; harmless everywhere else.
  h['HTTP-Referer'] = 'https://github.com/1enMap/up2date';
  h['X-Title'] = 'Up2Date';
  return h;
}

function quotaFrom(res: Response, body: ChatResponse, model: string): QuotaError {
  const retryAfter = Number(res.headers.get('retry-after'));
  const message = body.error?.message ?? '';
  const daily = /daily|per day|quota exceeded|insufficient|balance/i.test(message);
  return new QuotaError(
    daily ? `${model}: ${message || 'daily quota or credit exhausted'}` : `${model} hit a rate limit.`,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    daily,
  );
}

export async function runOpenAiCompatible(
  config: AiConfig,
  call: Call,
  signal?: AbortSignal,
): Promise<CallResult> {
  const model = config.model;
  if (!model) throw new AiNotConfiguredError();

  const res = await fetch(endpoint(config, '/chat/completions'), {
    method: 'POST',
    signal,
    headers: headers(config),
    body: JSON.stringify({
      model,
      max_tokens: call.maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: call.system },
        ...call.messages.map((t) => ({ role: t.role, content: t.content })),
      ],
    }),
  });

  const body = (await res.json().catch(() => ({}))) as ChatResponse;

  if (res.status === 429) throw quotaFrom(res, body, model);
  if (res.status === 401 || res.status === 403) {
    throw new Error('That key was rejected. Check it, and that it can reach this model.');
  }
  if (!res.ok) {
    throw new Error(body.error?.message ?? `Request failed (${res.status}). Check the base URL and model id.`);
  }

  const text = (body.choices?.[0]?.message?.content ?? '').trim();
  if (!text) throw new Error('The model returned an empty response.');

  // These endpoints have no server-side search tool, so nothing to cite.
  return { text, sources: [] };
}

/** `GET /models` — used to check a key and to populate the model picker. */
export async function listOpenAiModels(config: AiConfig, signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(endpoint(config, '/models'), { headers: headers(config), signal });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { id?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(body.error?.message ?? `Could not list models (${res.status}).`);
  return (body.data ?? [])
    .map((m) => m.id ?? '')
    .filter(Boolean)
    .sort();
}
