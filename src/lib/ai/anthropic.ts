import Anthropic from '@anthropic-ai/sdk';

import { QuotaError } from './limiter';
import { AiNotConfiguredError, type AiConfig, type Call, type CallResult } from './types';

const DEFAULT_MODEL = 'claude-opus-5';

function client(config: AiConfig) {
  if (!config.apiKey && !config.baseUrl) throw new AiNotConfiguredError();
  return new Anthropic({
    apiKey: config.apiKey ?? 'proxy',
    baseURL: config.baseUrl || undefined,
    // React Native has a `window` global but no DOM; the SDK's browser guard is not
    // meaningful here. The key lives in the device keychain, never in a web page.
    dangerouslyAllowBrowser: true,
  });
}

function rethrow(error: unknown): never {
  if (error instanceof Anthropic.RateLimitError) {
    const retryAfter = Number(error.headers?.get?.('retry-after'));
    throw new QuotaError('Claude rate-limited this key.', Number.isFinite(retryAfter) ? retryAfter : undefined);
  }
  if (error instanceof Anthropic.AuthenticationError) {
    throw new Error('That Anthropic key was rejected. Check it in Settings.');
  }
  throw error;
}

/** Lists models the key can reach — a free call, used to check a pasted key. */
export async function listAnthropicModels(config: AiConfig, signal?: AbortSignal): Promise<string[]> {
  const page = await client(config).models.list({ limit: 20 }, { signal }).catch(rethrow);
  return page.data.map((m) => m.id);
}

export async function runAnthropic(config: AiConfig, call: Call, signal?: AbortSignal): Promise<CallResult> {
  const tools: Anthropic.ToolUnion[] = call.search
    ? [
        {
          type: 'web_search_20260209',
          name: 'web_search',
          max_uses: call.search.maxUses ?? 5,
          ...(call.search.domains ? { allowed_domains: call.search.domains } : {}),
        },
      ]
    : [];

  const res = await client(config).messages.create(
    {
      model: config.model || DEFAULT_MODEL,
      max_tokens: call.maxTokens,
      thinking: { type: 'adaptive' },
      output_config: { effort: call.effort },
      system: [{ type: 'text', text: call.system, cache_control: { type: 'ephemeral' } }],
      ...(tools.length ? { tools } : {}),
      messages: call.messages.map((t) => ({ role: t.role, content: t.content })),
    },
    { signal },
  ).catch(rethrow);

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  const sources: CallResult['sources'] = [];
  for (const block of res.content) {
    if (block.type !== 'web_search_tool_result') continue;
    // An errored search returns a single object here rather than a list of results.
    if (!Array.isArray(block.content)) continue;
    for (const result of block.content) {
      if (result.type === 'web_search_result') sources.push({ title: result.title, url: result.url });
    }
  }

  return { text, sources, truncated: res.stop_reason === 'max_tokens' };
}
