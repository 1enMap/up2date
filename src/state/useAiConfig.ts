import Constants from 'expo-constants';
import { useMemo } from 'react';

import { getProvider, type ProviderPreset } from '@/data/providers';
import type { AiConfig } from '@/lib/ai';
import { getApiKey, useApiKey } from '@/state/apiKey';
import { useStore } from '@/state/store';

/**
 * A build handed to other people can ship with a proxy baked in (app.json →
 * expo.extra.defaultAiBaseUrl), so the AI features work without anyone pasting a key.
 * Anything set in Settings wins over it.
 */
const BUILT_IN_PROXY = String(Constants.expoConfig?.extra?.defaultAiBaseUrl ?? '');

export function builtInProxy() {
  return BUILT_IN_PROXY;
}

export type AiSetup = { config: AiConfig; ready: boolean; preset: ProviderPreset };

/** Merges the chosen preset with whatever the reader overrode. */
function build(providerId: string, overrideBaseUrl: string, overrideModel: string, apiKey: string | null): AiSetup {
  const preset = getProvider(providerId);
  const baseUrl = overrideBaseUrl || preset.baseUrl || BUILT_IN_PROXY;
  const model = overrideModel || preset.defaultModel;

  // The OpenAI-compatible adapter has no default host of its own, so it needs a
  // base URL as much as it needs a key. Local runners need no key at all.
  const ready =
    preset.kind === 'openai' ? !!baseUrl && !!model : !!(apiKey || baseUrl);

  return {
    preset,
    config: {
      kind: preset.kind,
      vendor: preset.id,
      apiKey: apiKey ?? undefined,
      baseUrl: baseUrl || undefined,
      model: model || undefined,
    },
    ready,
  };
}

export function useAiConfig(): AiSetup {
  const providerId = useStore((s) => s.providerId);
  const aiBaseUrl = useStore((s) => s.aiBaseUrl);
  const aiModel = useStore((s) => s.aiModel);
  const apiKey = useApiKey(providerId);

  return useMemo(
    () => build(providerId, aiBaseUrl, aiModel, apiKey),
    [providerId, aiBaseUrl, aiModel, apiKey],
  );
}

/** Same thing outside React, for the feed loader. */
export function currentAiConfig(): AiSetup {
  const { providerId, aiBaseUrl, aiModel } = useStore.getState();
  return build(providerId, aiBaseUrl, aiModel, getApiKey(providerId));
}
