import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Provider } from '@/lib/ai';

// SecureStore keys may only contain alphanumerics, ".", "-" and "_".
const STORE_KEY: Record<Provider, string> = {
  anthropic: 'up2date.key.anthropic',
  gemini: 'up2date.key.gemini',
};

// SecureStore has no web implementation; the web build falls back to AsyncStorage.
const backend =
  Platform.OS === 'web'
    ? {
        get: (k: string) => AsyncStorage.getItem(k),
        set: (k: string, v: string) => AsyncStorage.setItem(k, v),
        del: (k: string) => AsyncStorage.removeItem(k),
      }
    : {
        get: (k: string) => SecureStore.getItemAsync(k),
        set: (k: string, v: string) => SecureStore.setItemAsync(k, v),
        del: (k: string) => SecureStore.deleteItemAsync(k),
      };

const cached: Partial<Record<Provider, string | null>> = {};
const listeners = new Set<() => void>();

export async function loadApiKeys() {
  await Promise.all(
    (Object.keys(STORE_KEY) as Provider[]).map(async (provider) => {
      cached[provider] = await backend.get(STORE_KEY[provider]).catch(() => null);
    }),
  );
  listeners.forEach((l) => l());
}

export function getApiKey(provider: Provider) {
  return cached[provider] ?? null;
}

export async function saveApiKey(provider: Provider, value: string) {
  const trimmed = value.trim();
  if (trimmed) await backend.set(STORE_KEY[provider], trimmed);
  else await backend.del(STORE_KEY[provider]);
  cached[provider] = trimmed || null;
  listeners.forEach((l) => l());
}

/** Re-renders when any provider's key changes. */
export function useApiKey(provider: Provider) {
  const [key, setKey] = useState<string | null>(cached[provider] ?? null);
  useEffect(() => {
    const sync = () => setKey(cached[provider] ?? null);
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [provider]);
  return key;
}
