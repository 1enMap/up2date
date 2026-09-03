import { useMemo } from 'react';
import Constants from 'expo-constants';

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

/** The provider config the screens pass into every AI call. */
export function useAiConfig(): { config: AiConfig; ready: boolean } {
  const provider = useStore((s) => s.aiProvider);
  const aiBaseUrl = useStore((s) => s.aiBaseUrl);
  const aiModel = useStore((s) => s.aiModel);
  const apiKey = useApiKey(provider);
  const baseUrl = aiBaseUrl || BUILT_IN_PROXY;

  return useMemo(
    () => ({
      config: {
        provider,
        apiKey: apiKey ?? undefined,
        baseUrl: baseUrl || undefined,
        model: aiModel || undefined,
      },
      ready: !!(apiKey || baseUrl),
    }),
    [provider, apiKey, baseUrl, aiModel],
  );
}

/** Same thing outside React, for the feed loader. */
export function currentAiConfig(): { config: AiConfig; ready: boolean } {
  const { aiProvider, aiBaseUrl, aiModel } = useStore.getState();
  const apiKey = getApiKey(aiProvider);
  const baseUrl = aiBaseUrl || BUILT_IN_PROXY;
  return {
    config: {
      provider: aiProvider,
      apiKey: apiKey ?? undefined,
      baseUrl: baseUrl || undefined,
      model: aiModel || undefined,
    },
    ready: !!(apiKey || baseUrl),
  };
}
