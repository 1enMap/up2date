import { getProvider } from '@/data/providers';

import type { AiConfig } from './types';

/**
 * What the selected provider can actually do.
 *
 * This replaces an inline `kind !== 'openai' || vendor === 'xai'` check that had
 * drifted away from `ProviderPreset.search` — the flag said one thing and the
 * dispatch did another. The preset is now the single source of truth, and the
 * reason is a sentence the UI can show verbatim rather than a silent boolean.
 */
export type JsonMode = 'openai-json-object' | 'gemini-mime' | 'anthropic-prefill';

export type Capabilities = {
  search: boolean;
  /** Why, in the reader's terms. Shown when a feature is unavailable. */
  searchReason: string;
  jsonMode: JsonMode;
  /** true when structured output and web search cannot be combined here. */
  jsonConflictsWithSearch: boolean;
};

const REASONS: Record<string, string> = {
  anthropic: 'Claude has a built-in web search tool.',
  gemini: 'Gemini is grounded in Google Search.',
  xai: 'xAI Live Search reads X and the web.',
};

export function capabilitiesFor(config: AiConfig): Capabilities {
  const preset = getProvider(config.vendor ?? '');

  // OpenRouter only searches when the model id opts in, which the preset note
  // already promises the reader.
  const onlineModel = preset.id === 'openrouter' && /:online$/.test(config.model ?? '');
  const search = preset.search || onlineModel;

  const jsonMode: JsonMode =
    config.kind === 'gemini' ? 'gemini-mime' : config.kind === 'anthropic' ? 'anthropic-prefill' : 'openai-json-object';

  return {
    search,
    searchReason: search
      ? REASONS[preset.id] ??
        (onlineModel
          ? 'This OpenRouter model ends in :online, so it searches the web.'
          : `${preset.label} can search the web.`)
      : preset.id === 'openrouter'
        ? 'OpenRouter only searches when the model id ends in ":online" — add that suffix to the model to enable fact checks.'
        : `${preset.label} has no web search, so a fact check here would have nothing to check against.`,
    jsonMode,
    // Gemini rejects a response schema alongside the search tool; a prefilled
    // assistant turn fights Anthropic's tool-use loop.
    jsonConflictsWithSearch: jsonMode !== 'openai-json-object',
  };
}
